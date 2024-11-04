const html5QrCode = new Html5Qrcode("reader");

const ustadz = [
  "Dafa Putra Rabbani",
  "Art Tyas Fattah Pradhipta",
  "Marganus Satya Negara",
  "Abdul Muiz",
  "Ibrahim",
];
const ustadzah = [
  "Afifah Aslam Izzati",
  "Bekti Wulandari",
  "Darsih",
  "Desinta",
  "Isna Choiriyah",
  "Laras Budyaningrum",
  "Nurjanah",
  "Shofi",
];

function saveToLocalStorage(data) {
  let presensiData = JSON.parse(localStorage.getItem("presensiData")) || [];

  // Check for duplicates in presensiData
  const isDuplicate = presensiData.some(
    (entry) => entry.nama === data.nama && entry.keterangan === data.keterangan
  );

  if (!isDuplicate) {
    presensiData.push(data); // Save only if it's not a duplicate
    localStorage.setItem("presensiData", JSON.stringify(presensiData));
    addRowToTable(data); // Display only unique entries in the table
  }
}

function saveToLocalStorageTodayAttendance(todayData) {
  const uniqueTodayData = todayData.filter(
    (item, index, self) =>
      index ===
      self.findIndex((t) => t.nama === item.nama && t.hari === item.hari)
  );
  localStorage.setItem("attendanceData", JSON.stringify(uniqueTodayData));
}

function addRowToTable(data) {
  const tableBody = document
    .getElementById("presensiTable")
    .querySelector("tbody");

  const existingRows = Array.from(tableBody.querySelectorAll("tr"));
  const isDuplicateInTable = existingRows.some((row) => {
    const cells = row.getElementsByTagName("td");
    return (
      cells[2] &&
      cells[2].textContent === data.nama &&
      cells[4] &&
      cells[4].textContent === data.hari
    );
  });

  if (!isDuplicateInTable) {
    const row = document.createElement("tr");
    Object.values(data).forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });
    tableBody.appendChild(row);
  }
}

// Display status message
function showStatus(message, isError = false) {
  const statusDiv = document.getElementById("status");
  statusDiv.className = `status ${isError ? "error" : "success"}`;
  statusDiv.textContent = message;
}

function displayTodayAttendance() {
  const today = new Date();
  const formattedToday = `${today.getDate()} ${new Intl.DateTimeFormat(
    "id-ID",
    { month: "long" }
  ).format(today)} ${today.getFullYear()}`;

  const presensiData = JSON.parse(localStorage.getItem("presensiData")) || [];
  const todayData = presensiData.filter(
    (item) => item.tanggal === formattedToday
  );

  const ustadzList = document.getElementById("ustadzList");
  const ustadzahList = document.getElementById("ustadzahList");

  ustadzList.innerHTML = "";
  ustadzahList.innerHTML = "";

  // Ensure only unique entries are displayed for today
  const uniqueTodayData = todayData.filter(
    (item, index, self) =>
      index ===
      self.findIndex((t) => t.nama === item.nama && t.hari === item.hari)
  );

  uniqueTodayData.forEach((data) => {
    const listItem = document.createElement("li");
    listItem.textContent = `${data.nama} - ${data.keterangan}`;

    if (ustadz.includes(data.nama)) {
      ustadzList.appendChild(listItem);
    } else if (ustadzah.includes(data.nama)) {
      ustadzahList.appendChild(listItem);
    }
  });

  saveToLocalStorageTodayAttendance(uniqueTodayData);
}

// Process QR code result
const qrCodeSuccessCallback = async (decodedText) => {
  try {
    // Extract information from QR code
    const [name, role, status] = decodedText.split("-");
    if (!name || !role || !status)
      throw new Error("Format QR code tidak valid");

    // Validate role and name
    const isValid =
      (role === "Ustadz" && ustadz.includes(name)) ||
      (role === "Ustadzah" && ustadzah.includes(name));
    if (!isValid) throw new Error("Nama atau peran tidak sesuai");

    // Prepare attendance data
    const now = new Date();
    const data = {
      hari: new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(now),
      tanggal: `${now.getDate()} ${new Intl.DateTimeFormat("id-ID", {
        month: "long",
      }).format(now)} ${now.getFullYear()}`,
      nama: name,
      jam:
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }) + " WIB",
      keterangan: status,
    };

    // Save to both local storage and display on UI
    saveToLocalStorage(data);
    displayTodayAttendance();

    Swal.fire({
      title: "Berhasil absen",
      text: `Presensi berhasil - ${name}`,
      icon: "success",
      showConfirmButton: false,
      timer: 1800,
    });

    await html5QrCode.pause(true);
    setTimeout(() => {
      html5QrCode.resume();
      showStatus("Scanner siap digunakan kembali");
    }, 2000);
  } catch (error) {
    showStatus(error.message, true);
  }
};

const config = {
  fps: 30,
  qrbox: { width: 180, height: 180 },
  aspectRatio: 1.0,
};

html5QrCode
  .start({ facingMode: "user" }, config, qrCodeSuccessCallback)
  .catch((err) =>
    showStatus("Gagal memulai scanner QR. Pastikan kamera diizinkan.", true)
  );

function downloadCsv() {
  const today = new Date();
  const day = today.getDay(); // 0=Sunday, 5=Friday, 6=Saturday

  // if (day !== 5 && day !== 0) {
  //   // Check if today is Friday (5) or Sunday (0)
  //   Swal.fire({
  //     icon: "warning",
  //     title: "Hari Tidak Sesuai",
  //     text: "Rekap presensi hanya dapat didownload pada hari Jum'at atau Ahad.",
  //     showConfirmButton: false,
  //     timer: 2000,
  //   });
  //   return;
  // }

  const presensiData = JSON.parse(localStorage.getItem("presensiData")) || [];
  if (presensiData.length === 0) {
    Swal.fire({
      icon: "info",
      title: "Data Kosong",
      text: "Tidak ada data presensi untuk didownload.",
      showConfirmButton: false,
      timer: 2000,
    });
    return;
  }

  let csvContent = "Hari,Tanggal,Nama,Jam,Keterangan\n";
  presensiData.forEach((data) => {
    csvContent += `${data.hari},${data.tanggal},${data.nama},${data.jam},${data.keterangan}\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const formattedDownloadCsvToday = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
  }).format(today);
  const formattedDownloadCsvMonth = new Intl.DateTimeFormat("id-ID", {
    month: "long",
  }).format(today);
  link.href = URL.createObjectURL(blob);
  link.download = `Presensi Ustadz Ustadzah_${formattedDownloadCsvToday} ${today.getDate()}-${formattedDownloadCsvMonth}-${today.getFullYear()}.csv`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const btnDownloadedCsv = document.getElementById("downloadCsvBtn");
btnDownloadedCsv.addEventListener("click", downloadCsv);

window.onload = () => {
  const presensiData = JSON.parse(localStorage.getItem("presensiData")) || [];
  const uniquePresensiData = presensiData.filter(
    (item, index, self) =>
      index ===
      self.findIndex((t) => t.nama === item.nama && t.hari === item.hari)
  );
  uniquePresensiData.forEach(addRowToTable);
  displayTodayAttendance();
};
