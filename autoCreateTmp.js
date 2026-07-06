import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

const currentDir = process.cwd();
const tmpDir = path.join(currentDir, 'tmp');
const clanFilePath = path.join(currentDir, 'clan.json'); // File clan.json berada di luar folder tmp

// Periksa apakah folder 'tmp' ada
if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
    console.log(chalk.green.bold('Folder TMP telah dibuat.'));
} else {
    console.log(chalk.yellow.bold('Folder TMP sudah ada.'));
}

// Periksa apakah file 'clan.json' ada, dan buat jika belum ada
if (!fs.existsSync(clanFilePath)) {
    // Isi file dengan struktur yang diinginkan
    const initialData = {
        "clans": {},
        "members": {}
    };

    // Tulis data ke dalam file 'clan.json'
    fs.writeFileSync(clanFilePath, JSON.stringify(initialData, null, 2)); // Menulis data JSON dengan indentasi
    console.log(chalk.green.bold('File clan.json telah dibuat dengan isi yang diinginkan.'));
} else {
    console.log(chalk.yellow.bold('File clan.json sudah ada.'));
}