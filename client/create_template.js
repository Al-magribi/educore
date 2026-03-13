const XLSX = require('xlsx');

const data = [
  ['NIP', 'Nama', 'L/P', 'Telepon', 'Email'],
  ['123456789', 'John Doe', 'L', '081234567890', 'john.doe@example.com'],
];

const ws = XLSX.utils.aoa_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Template');
XLSX.writeFile(wb, 'd:/projects/educore/client/public/template/template_guru.xlsx');
