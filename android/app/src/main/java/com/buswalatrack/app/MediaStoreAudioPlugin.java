package com.buswalatrack.app;

import android.Manifest;
import android.content.ContentUris;
import android.content.Context;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.util.Base64;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

@CapacitorPlugin(
    name = "MediaStoreAudio",
    permissions = {
        @Permission(
            alias = "audio",
            strings = {
                Manifest.permission.READ_MEDIA_AUDIO
            }
        ),
        @Permission(
            alias = "storage",
            strings = {
                Manifest.permission.READ_EXTERNAL_STORAGE
            }
        )
    }
)
public class MediaStoreAudioPlugin extends Plugin {

    private boolean hasAudioPermission() {
        Context context = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) { // Android 13+ (API 33)
            return ContextCompat.checkSelfPermission(context, Manifest.permission.READ_MEDIA_AUDIO) == PackageManager.PERMISSION_GRANTED;
        } else { // Android 12 and below
            return ContextCompat.checkSelfPermission(context, Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
        }
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        JSObject ret = new JSObject();
        boolean granted = hasAudioPermission();
        ret.put("granted", granted);
        ret.put("androidVersion", Build.VERSION.SDK_INT);
        ret.put("permissionRequired", Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU ? "READ_MEDIA_AUDIO" : "READ_EXTERNAL_STORAGE");
        call.resolve(ret);
    }

    @PluginMethod
    public void requestAudioPermission(PluginCall call) {
        if (hasAudioPermission()) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            ret.put("androidVersion", Build.VERSION.SDK_INT);
            call.resolve(ret);
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requestPermissionForAlias("audio", call, "audioPermissionCallback");
        } else {
            requestPermissionForAlias("storage", call, "audioPermissionCallback");
        }
    }

    @PermissionCallback
    private void audioPermissionCallback(PluginCall call) {
        JSObject ret = new JSObject();
        boolean granted = hasAudioPermission();
        ret.put("granted", granted);
        ret.put("androidVersion", Build.VERSION.SDK_INT);
        call.resolve(ret);
    }

    @PluginMethod
    public void queryAudioFiles(PluginCall call) {
        try {
            if (!hasAudioPermission()) {
                JSObject ret = new JSObject();
                ret.put("status", "PERMISSION_DENIED");
                ret.put("message", "Audio/Storage permission not granted. Please allow access to device audio files.");
                ret.put("songs", new JSArray());
                call.resolve(ret);
                return;
            }

            Context context = getContext();
            Uri collectionUri;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                collectionUri = MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL);
            } else {
                collectionUri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
            }

            String[] projection = new String[] {
                MediaStore.Audio.Media._ID,
                MediaStore.Audio.Media.TITLE,
                MediaStore.Audio.Media.ARTIST,
                MediaStore.Audio.Media.DURATION,
                MediaStore.Audio.Media.DISPLAY_NAME,
                MediaStore.Audio.Media.SIZE,
                MediaStore.Audio.Media.MIME_TYPE,
                MediaStore.Audio.Media.DATE_ADDED
            };

            // Only query actual audio tracks and exclude ringtones/notifications/alarms
            String selection = MediaStore.Audio.Media.IS_MUSIC + " != 0 OR " +
                               MediaStore.Audio.Media.MIME_TYPE + " LIKE 'audio/%' OR " +
                               MediaStore.Audio.Media.DISPLAY_NAME + " LIKE '%.mp3' OR " +
                               MediaStore.Audio.Media.DISPLAY_NAME + " LIKE '%.wav' OR " +
                               MediaStore.Audio.Media.DISPLAY_NAME + " LIKE '%.m4a' OR " +
                               MediaStore.Audio.Media.DISPLAY_NAME + " LIKE '%.aac' OR " +
                               MediaStore.Audio.Media.DISPLAY_NAME + " LIKE '%.ogg' OR " +
                               MediaStore.Audio.Media.DISPLAY_NAME + " LIKE '%.flac'";

            String sortOrder = MediaStore.Audio.Media.DATE_ADDED + " DESC";

            JSArray songsArray = new JSArray();

            try (Cursor cursor = context.getContentResolver().query(collectionUri, projection, selection, null, sortOrder)) {
                if (cursor != null) {
                    int idColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID);
                    int titleColumn = cursor.getColumnIndex(MediaStore.Audio.Media.TITLE);
                    int artistColumn = cursor.getColumnIndex(MediaStore.Audio.Media.ARTIST);
                    int durationColumn = cursor.getColumnIndex(MediaStore.Audio.Media.DURATION);
                    int displayNameColumn = cursor.getColumnIndex(MediaStore.Audio.Media.DISPLAY_NAME);
                    int sizeColumn = cursor.getColumnIndex(MediaStore.Audio.Media.SIZE);
                    int mimeColumn = cursor.getColumnIndex(MediaStore.Audio.Media.MIME_TYPE);
                    int dateAddedColumn = cursor.getColumnIndex(MediaStore.Audio.Media.DATE_ADDED);

                    while (cursor.moveToNext()) {
                        long id = cursor.getLong(idColumn);
                        String title = titleColumn != -1 ? cursor.getString(titleColumn) : null;
                        String artist = artistColumn != -1 ? cursor.getString(artistColumn) : null;
                        long durationMs = durationColumn != -1 ? cursor.getLong(durationColumn) : 0;
                        String displayName = displayNameColumn != -1 ? cursor.getString(displayNameColumn) : null;
                        long size = sizeColumn != -1 ? cursor.getLong(sizeColumn) : 0;
                        String mimeType = mimeColumn != -1 ? cursor.getString(mimeColumn) : "audio/mpeg";
                        long dateAdded = dateAddedColumn != -1 ? cursor.getLong(dateAddedColumn) : 0;

                        // Filter out ultra-short notification beeps (under 5 seconds) or 0 byte files
                        if (size > 0 && (durationMs >= 4000 || durationMs == 0)) {
                            Uri contentUri = ContentUris.withAppendedId(collectionUri, id);

                            JSObject songObj = new JSObject();
                            songObj.put("id", "mediastore-" + id);
                            songObj.put("mediaStoreId", id);
                            songObj.put("title", (title != null && !title.trim().isEmpty()) ? title.trim() : (displayName != null ? displayName.replaceFirst("[.][^.]+$", "") : "Track " + id));
                            songObj.put("artist", (artist != null && !artist.trim().isEmpty() && !artist.equals("<unknown>")) ? artist.trim() : "Local Device");
                            songObj.put("duration", durationMs > 0 ? (double) durationMs / 1000.0 : 180.0);
                            songObj.put("fileName", displayName != null ? displayName : "audio.mp3");
                            songObj.put("mimeType", mimeType != null ? mimeType : "audio/mpeg");
                            songObj.put("contentUri", contentUri.toString());
                            songObj.put("size", size);
                            songObj.put("dateAdded", dateAdded);

                            songsArray.put(songObj);
                        }
                    }
                }
            }

            JSObject ret = new JSObject();
            ret.put("status", "SUCCESS");
            ret.put("count", songsArray.length());
            ret.put("songs", songsArray);
            call.resolve(ret);

        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("status", "ERROR");
            ret.put("message", e.getMessage() != null ? e.getMessage() : "Failed to query MediaStore");
            ret.put("songs", new JSArray());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void getAudioBase64(PluginCall call) {
        String contentUriStr = call.getString("contentUri");
        if (contentUriStr == null || contentUriStr.isEmpty()) {
            call.reject("contentUri is required");
            return;
        }

        try {
            Uri contentUri = Uri.parse(contentUriStr);
            Context context = getContext();

            try (InputStream inputStream = context.getContentResolver().openInputStream(contentUri)) {
                if (inputStream == null) {
                    call.reject("Could not open input stream for " + contentUriStr);
                    return;
                }

                ByteArrayOutputStream byteBuffer = new ByteArrayOutputStream();
                byte[] buffer = new byte[8192];
                int len;
                while ((len = inputStream.read(buffer)) != -1) {
                    byteBuffer.write(buffer, 0, len);
                }

                byte[] audioBytes = byteBuffer.toByteArray();
                String base64Data = Base64.encodeToString(audioBytes, Base64.NO_WRAP);

                JSObject ret = new JSObject();
                ret.put("base64", base64Data);
                ret.put("size", audioBytes.length);
                call.resolve(ret);
            }
        } catch (Exception e) {
            call.reject("Failed to read audio file: " + e.getMessage(), e);
        }
    }
}
