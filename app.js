// Import dependencies
const express = require('express');
const router = require('express').Router();
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const url = require('url');
const path = require('path');
const { PNG } = require('pngjs');
const methodOverride = require('method-override');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const session = require('express-session');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(methodOverride('_method'));
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 10000000 }
}));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use((req,res,next) => {
    res.header('Access-Control-Allow-Origin','*');
    res.header('Access-Control-Allow-Methods','PUT,POST,DELETE,GET,OPTIONS,PATCH');
    res.header('Access-Control-Allow-Headers','*');
    next();
});


// Views
const getRouter = router.get('',  async (req, res) => {
  try {
      res.render('home_page', {});
  } catch (error) {
     console.log(error);
  }
});

app.use("/", getRouter);

// Services
const upload = multer({ dest: 'uploads/' });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Fungsi untuk mendapatkan URL
const getUrl = (req) => url.format({
  protocol: req.protocol,
  host: req.get('host'),
});

// Middleware untuk parsing JSON
app.use(express.json());

// Endpoint untuk menambahkan watermark
app.post('/watermark', upload.single('image'), async (req, res) => {
  try {
    const { text } = req.body;
    const imagePath = req.file.path;
    const url = getUrl(req)
    const outputPath = `uploads/watermark/watermarked_${Date.now()}.png`;

    // Dapatkan dimensi gambar
    const metadata = await sharp(imagePath).metadata();
    const { width, height } = metadata;

    // Buat SVG dengan watermark diulang
    const fontSize = 24;
    const opacity = 1;
    const textWidth = 100; // Perkiraan lebar watermark per teks
    const textHeight = 50; // Perkiraan tinggi watermark per teks

    let svgText = `<svg width="${width}" height="${height}">`;
    for (let y = 0; y < height; y += textHeight) {
      for (let x = 0; x < width; x += textWidth) {
        svgText += `<text x="${x}" y="${y + fontSize}" font-size="${fontSize}" fill="white" opacity="${opacity}">${text}</text>`;
      }
    }
    svgText += `</svg>`;

    // Tambahkan watermark ke gambar
    await sharp(imagePath)
      .composite([{ input: Buffer.from(svgText), blend: 'overlay' }])
      .toFile(outputPath);

    fs.unlinkSync(imagePath);

    res.status(200).json({ url: `${url}/${outputPath}`, message: "Watermark telah disisipkan"});
  } catch (error) {
    console.log("Error: " + error);
    res.status(500).json({ error: 'Terjadi kesalahan saat menambahkan watermark.' });
  }
});


// Endpoint untuk steganography (menyisipkan pesan)
app.post('/steganography', upload.single('image'), async (req, res) => {
  const imagePath = req.file.path;  // Path file gambar yang diupload
  const stegoFolderPath = 'uploads/steganography';
  const url = getUrl(req)

  // Pastikan folder "steganography" ada, jika tidak buat
  if (!fs.existsSync(stegoFolderPath)) {
    fs.mkdirSync(stegoFolderPath, { recursive: true });
  }

  const pngPath = path.join(stegoFolderPath, `${path.basename(imagePath)}.png`); // Path untuk file PNG hasil

  try {
    // Konversi file ke PNG menggunakan sharp
    await sharp(imagePath).png().toFile(pngPath);
    fs.unlinkSync(imagePath); // Hapus file asli setelah konversi

    const { message } = req.body; // Pesan yang akan disisipkan

    fs.createReadStream(pngPath)
      .pipe(new PNG())
      .on('parsed', function () {
        // Konversi pesan menjadi biner
        const binaryMessage = message
            .split('')
            .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))  // Setiap karakter jadi biner 8-bit
            .join('');

        // Sisipkan pesan biner ke dalam gambar
        for (let i = 0; i < binaryMessage.length && i < this.data.length; i++) {
          this.data[i] = (this.data[i] & 0xfe) | parseInt(binaryMessage[i], 10); // Sisipkan bit pesan ke dalam byte gambar
        }

        // Simpan gambar yang telah disisipkan pesan ke dalam folder steganography
        this.pack().pipe(fs.createWriteStream(pngPath)).on('finish', () => {
          res.status(200).json({
            url: `${url}/${pngPath}`,
            message: `Pesan steganografi telah disisipkan: ${message}`
          });
        });
      })
      .on('error', (error) => {
        res.status(500).json({ error: 'Terjadi kesalahan saat menyisipkan pesan.' });
      });
  } catch (error) {
    console.log("Error: " + error);
    res.status(500).json({ error: 'Terjadi kesalahan saat mengonversi file ke PNG.' });
  }
});

// // Endpoint untuk membaca pesan dari gambar steganography
app.post('/steganography/decode', upload.single('image'), (req, res) => {
  const imagePath = req.file.path;

  fs.createReadStream(imagePath)
    .pipe(new PNG())
    .on('parsed', function () {
      let binaryMessage = '';
      for (let i = 0; i < this.data.length; i++) {
        binaryMessage += (this.data[i] & 1).toString(); // Ambil bit terakhir dari setiap byte
      }
      
      // Menghapus bagian setelah '00000000' sebagai pemisah
      const trimmedBinaryMessage = binaryMessage.split('00000000')[0];

      // Decode menjadi pesan asli
      let decode = trimmedBinaryMessage
        .match(/.{1,8}/g)  // Pecah menjadi byte 8-bit
        ?.map(byte => String.fromCharCode(parseInt(byte, 2)))  // Mengubah setiap byte menjadi karakter
        .join('') || '';

      // Hapus karakter non-ASCII atau padding yang tidak diinginkan
      decode = decode.replace(/[^\x20-\x7E]/g, '').trim(); // Menghapus karakter di luar rentang ASCII
      decode = decode.substring(0, 100); 
      // Jika panjang pesan lebih panjang dari yang diinginkan, ambil substring yang sesuai
      fs.unlinkSync(imagePath);
      res.json({ decode });
    })
    .on('error', (error) => {
      console.log("Error: " + error);
      res.status(500).json({ error: 'Terjadi kesalahan saat membaca pesan.' });
    });
});

// Menjalankan server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
