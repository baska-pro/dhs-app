/**
 * ====================================================================
 * DHS App (Daily Habit System) - Google Sheets Sync Engine
 * ====================================================================
 * Setup:
 * 1. Buat Spreadsheet baru di https://sheets.new
 * 2. Extensions > Apps Script, lalu tempel SELURUH isi file ini.
 * 3. Deploy > New deployment > Web app.
 * 4. Execute as: Me.
 * 5. Who has access: Anyone.
 * 6. Salin URL Web App yang berakhiran /exec ke DHS App.
 *
 * PROTEKSI OPSIONAL (SANGAT DISARANKAN):
 * - Apps Script > Project Settings > Script Properties.
 * - Tambahkan property DHS_ACCESS_KEY dengan nilai acak panjang (32+ karakter).
 * - Gunakan URL di DHS App seperti:
 *   https://script.google.com/macros/s/DEPLOYMENT_ID/exec?key=ACCESS_KEY_ANDA
 * - Jika property tidak dibuat, script tetap kompatibel dengan setup lama.
 * - Jangan commit URL Web App beserta access key ke repository publik.
 * ====================================================================
 */

function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return responseJSON({ status: 'error', message: 'Tidak ada data POST yang diterima.' });
  }

  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (parseErr) {
    return responseJSON({ status: 'error', message: 'Payload JSON tidak valid.' });
  }

  if (!isAuthorized(e, data)) {
    return responseJSON({ status: 'error', message: 'Akses ditolak. Access key tidak valid.' });
  }

  if (data.action === 'ping') {
    return responseJSON({
      status: 'ok',
      message: 'Koneksi ke Google Apps Script berhasil dan siap digunakan!',
      protected: isProtectionEnabled(),
      timestamp: new Date().toISOString()
    });
  }

  if (data.action !== 'sync_all') {
    return responseJSON({ status: 'error', message: 'Aksi (' + data.action + ') tidak dikenali.' });
  }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return responseJSON({ status: 'error', message: 'Server sedang sibuk. Coba sinkronkan kembali beberapa saat lagi.' });
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var backupSheet = getOrCreateSheet(ss, 'DHS_Backup');

    if (backupSheet.getLastRow() === 0) {
      backupSheet.appendRow(['Timestamp Terakhir', 'Sync Key', 'User Profile (JSON)', 'Daily Logs (JSON)', 'System Settings (JSON)']);
    }
    backupSheet.getRange(1, 1, 1, 5)
      .setFontWeight('bold')
      .setBackground('#0d9488')
      .setFontColor('#ffffff');

    backupSheet.getRange(2, 1, 1, 5).setValues([[
      new Date(),
      safeSheetCell(data.syncKey || 'dhs_user'),
      JSON.stringify(data.user || {}),
      JSON.stringify(data.logs || {}),
      JSON.stringify(data.settings || {})
    ]]);

    var logsSheet = getOrCreateSheet(ss, 'DHS_Daily_Logs');
    if (logsSheet.getLastRow() === 0) {
      logsSheet.appendRow([
        'Tanggal', 'Total Poin', 'Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya',
        'Air Minum', 'Sunnah Selesai', 'Amalan Kustom', 'Catatan Evaluasi / Refleksi'
      ]);
    }
    logsSheet.getRange(1, 1, 1, 11)
      .setFontWeight('bold')
      .setBackground('#0f766e')
      .setFontColor('#ffffff');

    if (data.logs && typeof data.logs === 'object') {
      var existingData = logsSheet.getDataRange().getValues();
      var dateRowMap = {};
      for (var i = 1; i < existingData.length; i++) {
        dateRowMap[String(existingData[i][0])] = i + 1;
      }

      Object.keys(data.logs).sort().forEach(function(dt) {
        var item = data.logs[dt] || {};
        var prayers = item.prayers || {};
        var rowValues = [
          safeSheetCell(dt),
          Number(item.points) || 0,
          safeSheetCell(prayers.Subuh || '-'),
          safeSheetCell(prayers.Dzuhur || '-'),
          safeSheetCell(prayers.Ashar || '-'),
          safeSheetCell(prayers.Maghrib || '-'),
          safeSheetCell(prayers.Isya || '-'),
          safeSheetCell((Number(item.waterLitres) || 0) + (data.user && data.user.waterUnit === 'G' ? ' Gelas' : ' L')),
          safeSheetCell(Array.isArray(item.sunnah) ? item.sunnah.join(', ') : '-'),
          safeSheetCell(Array.isArray(item.customHabits) ? item.customHabits.length + ' amalan selesai' : '-'),
          safeSheetCell(item.notes || '')
        ];

        if (dateRowMap[dt]) {
          logsSheet.getRange(dateRowMap[dt], 1, 1, rowValues.length).setValues([rowValues]);
        } else {
          logsSheet.appendRow(rowValues);
        }
      });
    }

    return responseJSON({
      status: 'success',
      message: 'Data DHS App berhasil disimpan ke Google Spreadsheet.',
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    return responseJSON({ status: 'error', message: 'Terjadi kesalahan pada script: ' + err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var action = e && e.parameter ? String(e.parameter.action || '') : '';

  if (action !== 'get_all') {
    return responseJSON({
      status: 'ok',
      service: 'DHS App Google Sheets Sync Engine',
      protected: isProtectionEnabled(),
      timestamp: new Date().toISOString()
    });
  }

  if (!isAuthorized(e, null)) {
    return responseJSON({ status: 'error', message: 'Akses ditolak. Access key tidak valid.' });
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var backupSheet = ss.getSheetByName('DHS_Backup');

    if (!backupSheet || backupSheet.getLastRow() < 2) {
      return responseJSON({ status: 'error', message: 'Belum ada data cadangan di spreadsheet ini.' });
    }

    var userStr = backupSheet.getRange(2, 3).getValue();
    var logsStr = backupSheet.getRange(2, 4).getValue();
    var settingsStr = backupSheet.getRange(2, 5).getValue();

    return responseJSON({
      status: 'success',
      user: parseBackupJSON(userStr),
      logs: parseBackupJSON(logsStr),
      settings: parseBackupJSON(settingsStr),
      updatedAt: backupSheet.getRange(2, 1).getValue()
    });
  } catch (err) {
    return responseJSON({ status: 'error', message: 'Gagal menarik data: ' + err.toString() });
  }
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function parseBackupJSON(value) {
  if (!value) return {};
  return JSON.parse(String(value));
}

function safeSheetCell(value) {
  var text = String(value == null ? '' : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function isProtectionEnabled() {
  return Boolean(PropertiesService.getScriptProperties().getProperty('DHS_ACCESS_KEY'));
}

function isAuthorized(e, payload) {
  var expected = PropertiesService.getScriptProperties().getProperty('DHS_ACCESS_KEY');
  if (!expected) return true;

  var queryKey = e && e.parameter ? String(e.parameter.key || '') : '';
  var payloadKey = payload && payload.accessKey ? String(payload.accessKey) : '';
  return queryKey === expected || payloadKey === expected;
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
