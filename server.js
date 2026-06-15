require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const multer = require("multer");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, "data");
const BACKUP_DIR = path.join(__dirname, "backups");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "public/images/products"));
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + file.originalname.replace(/\s+/g, "-");
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

const mailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_SECURE || "true") === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function ensureFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

  if (!fs.existsSync(PRODUCTS_FILE)) {
    fs.writeFileSync(
      PRODUCTS_FILE,
      JSON.stringify(
        [
          {
            id: "p1",
            name: "Buchet Trandafiri Roșii",
            category: "Buchete",
            price: 189,
            stock: 12,
            image:
              "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=900&q=80",
            description: "Buchet elegant cu trandafiri roșii premium.",
          },
          {
            id: "p2",
            name: "Buchet Pastel",
            category: "Buchete",
            price: 149,
            stock: 8,
            image:
              "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=900&q=80",
            description:
              "Flori delicate în nuanțe pastel, potrivite pentru aniversări.",
          },
          {
            id: "p3",
            name: "Aranjament Cutie Luxury",
            category: "Aranjamente",
            price: 249,
            stock: 5,
            image:
              "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=900&q=80",
            description: "Aranjament floral în cutie premium.",
          },
          {
            id: "p4",
            name: "Orhidee Albă",
            category: "Plante",
            price: 119,
            stock: 10,
            image:
              "https://images.unsplash.com/photo-1512428813834-c702c7702b78?auto=format&fit=crop&w=900&q=80",
            description:
              "Orhidee albă în ghiveci, elegantă și ușor de întreținut.",
          },
        ],
        null,
        2
      )
    );
  }

  if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));
  }
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(16)
    .slice(2, 8)}`;
}

function lei(n) {
  return `${Number(n || 0).toLocaleString("ro-RO")} lei`;
}

function hasEmailConfig() {
  return (
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

async function sendOrderEmail(order) {
  if (!hasEmailConfig()) {
    console.log("Email comandă sărit: lipsesc variabilele SMTP.");
    return;
  }

  const productsText = order.items
    .map(
      (item) =>
        `- ${item.name} x ${item.qty} = ${lei(item.price * item.qty)}`
    )
    .join("\n");

  const text = `
Comandă nouă Dia Flowers

ID comandă: ${order.id}
Data: ${new Date(order.createdAt).toLocaleString("ro-RO")}
Status: ${order.status}

Client:
Nume: ${order.customer.name}
Telefon: ${order.customer.phone}
Email: ${order.customer.email || "-"}

Livrare:
Adresă: ${order.delivery.address}

Produse:
${productsText}

Total: ${lei(order.total)}

Observații:
${order.notes || "-"}
`.trim();

  await mailTransporter.sendMail({
    from: `"Dia Flowers" <${process.env.SMTP_USER}>`,
    to: process.env.ORDER_EMAIL_TO || process.env.SMTP_USER,
    subject: `Comandă nouă Dia Flowers - ${lei(order.total)}`,
    text,
  });

  if (order.customer.email) {
  await mailTransporter.sendMail({
    from: `"Dia Flowers" <${process.env.SMTP_USER}>`,
    to: order.customer.email,
    subject: "Comanda ta Dia Flowers a fost primită",
    text: `
Bună, ${order.customer.name}!

Îți mulțumim pentru comandă. Am primit solicitarea ta și te vom contacta telefonic pentru confirmarea livrării.

ID comandă: ${order.id}
Total: ${lei(order.total)}
Metodă plată: ${
      order.payment?.method === "card"
        ? "Plată online cu cardul"
        : "Plată la livrare"
    }

Produse:
${productsText}

Livrare:
Adresă: ${order.delivery.address}

Observații:
${order.notes || "-"}

Cu drag,
Dia Flowers
Flori care transmit emoții
Telefon: 0764 699 342
`.trim(),
  });
}
}

async function sendStatusEmail(order) {
  if (!order.customer.email) return;

  if (!hasEmailConfig()) {
    console.log("Email status sărit: lipsesc variabilele SMTP.");
    return;
  }

  let message = "";

  if (order.status === "Confirmată") {
    message = "Comanda ta a fost confirmată și va fi pregătită cu grijă.";
  } else if (order.status === "În lucru") {
    message = "Comanda ta este în pregătire.";
  } else if (order.status === "Livrată") {
    message =
      "Comanda ta a fost livrată. Îți mulțumim că ai ales Dia Flowers!";
  } else if (order.status === "Anulată") {
    message =
      "Comanda ta a fost anulată. Pentru detalii, te rugăm să ne contactezi.";
  } else {
    return;
  }

  await mailTransporter.sendMail({
    from: `"Dia Flowers" <${process.env.SMTP_USER}>`,
    to: order.customer.email,
    subject: `Status comandă Dia Flowers: ${order.status}`,
    text: `
Bună, ${order.customer.name}!

${message}

ID comandă: ${order.id}
Status actual: ${order.status}
Total: ${lei(order.total)}

Cu drag,
Dia Flowers
Flori care transmit emoții
Telefon: 0764 699 342
`.trim(),
  });
}
async function sendLowStockEmail(products) {
  if (!hasEmailConfig()) {
    console.log("Email stoc redus sărit: lipsesc variabilele SMTP.");
    return;
  }

  const lowStockProducts = products.filter(
    (p) => Number(p.stock || 0) <= 3
  );

  if (!lowStockProducts.length) return;

  const productsText = lowStockProducts
    .map((p) => `- ${p.name}: ${p.stock} buc.`)
    .join("\n");

  await mailTransporter.sendMail({
    from: `"Dia Flowers" <${process.env.SMTP_USER}>`,
    to: process.env.ORDER_EMAIL_TO || process.env.SMTP_USER,
    subject: "⚠️ Dia Flowers - produse cu stoc redus",
    text: `
Atenție, următoarele produse au stoc redus:

${productsText}

Recomandare: verifică Admin și reaprovizionează produsele.
`.trim(),
  });
}

ensureFiles();

app.get("/api/products", (req, res) => {
  res.json(readJson(PRODUCTS_FILE));
});

app.post("/api/products", (req, res) => {
  const { name, category, price, stock, image, images, description } = req.body;

  if (!name || !category || Number(price) <= 0) {
    return res.status(400).json({ error: "Date produs incomplete." });
  }

  const products = readJson(PRODUCTS_FILE);

  const product = {
    id: makeId("p"),
    name,
    category,
    price: Number(price),
    stock: Number(stock || 0),
    image: image || "",
    images: Array.isArray(images) ? images : [],
    description: description || "",
    bestseller: false,
  };

  products.unshift(product);
  writeJson(PRODUCTS_FILE, products);

  res.status(201).json(product);
});

app.put("/api/products/:id", (req, res) => {
  const products = readJson(PRODUCTS_FILE);
  const idx = products.findIndex((p) => p.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: "Produs negăsit." });
  }

  products[idx] = {
    ...products[idx],
    ...req.body,
    price: Number(req.body.price),
    stock: Number(req.body.stock),
  };

  writeJson(PRODUCTS_FILE, products);
  res.json(products[idx]);
});

app.delete("/api/products/:id", (req, res) => {
  const products = readJson(PRODUCTS_FILE).filter(
    (p) => p.id !== req.params.id
  );

  writeJson(PRODUCTS_FILE, products);

  res.json({ ok: true });
});

app.get("/api/orders", (req, res) => {
  res.json(readJson(ORDERS_FILE));
});

app.post("/api/orders", async (req, res) => {
  try {
    const {
  customer,
  items,
  delivery,
  notes,
  payment,
  promo,
} = req.body;

    if (!customer?.name || !customer?.phone || !items?.length) {
      return res.status(400).json({ error: "Comanda este incompletă." });
    }

    const products = readJson(PRODUCTS_FILE);
    let total = 0;

    const orderItems = items.map((item) => {
      const product = products.find((p) => p.id === item.id);

      if (!product) {
        throw new Error("Produs invalid");
      }

      const qty = Math.max(1, Number(item.qty || 1));

if (Number(product.stock || 0) < qty) {
  throw new Error(`Stoc insuficient pentru produsul: ${product.name}`);
}

product.stock = Number(product.stock || 0) - qty;

total += product.price * qty;

return {
  id: product.id,
  name: product.name,
  price: product.price,
  qty,
};
    });

    const orders = readJson(ORDERS_FILE);

    const order = {
  id: makeId("o"),
  createdAt: new Date().toISOString(),
  status: payment?.method === "card" ? "Așteaptă plata" : "Nouă",
  customer,
  delivery,
  payment: {
    method: payment?.method || "cash",
    status: payment?.method === "card" ? "Așteaptă plata" : "Plată la livrare",
  },
  promo: promo || null,
  notes: notes || "",
  items: orderItems,
  total,
};

    orders.unshift(order);
    writeJson(ORDERS_FILE, orders);
    writeJson(PRODUCTS_FILE, products);
    

    sendOrderEmail(order).catch((err) => {
      console.error("Eroare trimitere email comandă:", err.message);
    });
    sendLowStockEmail(products).catch((err) => {
  console.error("Eroare trimitere email stoc redus:", err.message);
});

    res.status(201).json(order);
  } catch (err) {
    res
      .status(400)
      .json({ error: err.message || "Eroare la salvarea comenzii." });
  }
});

app.patch("/api/orders/:id/status", async (req, res) => {
  const orders = readJson(ORDERS_FILE);
  const order = orders.find((o) => o.id === req.params.id);

  if (!order) {
    return res.status(404).json({ error: "Comandă negăsită." });
  }

  const oldStatus = order.status;
  order.status = req.body.status || order.status;

  writeJson(ORDERS_FILE, orders);

  if (oldStatus !== order.status) {
    sendStatusEmail(order).catch((err) => {
      console.error("Eroare trimitere email status:", err.message);
    });
  }

  res.json(order);
});

app.post("/api/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: "Nu ai selectat imagine.",
    });
  }

  res.json({
    imageUrl: `/images/products/${req.file.filename}`,
  });
});

app.post("/api/upload-multiple", upload.array("images", 10), (req, res) => {
  if (!req.files || !req.files.length) {
    return res.status(400).json({
      error: "Nu ai selectat imagini.",
    });
  }

  const imageUrls = req.files.map((file) => {
    return `/images/products/${file.filename}`;
  });

  res.json({
    imageUrls,
  });
});

app.get("/api/backup", (req, res) => {
  const backup = {
    createdAt: new Date().toISOString(),
    products: readJson(PRODUCTS_FILE),
    orders: readJson(ORDERS_FILE),
  };

  res.json(backup);
});

app.get("/api/backup/download", (req, res) => {
  const backup = {
    createdAt: new Date().toISOString(),
    products: readJson(PRODUCTS_FILE),
    orders: readJson(ORDERS_FILE),
  };

  const fileName = `diaflowers-backup-${Date.now()}.json`;
  const filePath = path.join(BACKUP_DIR, fileName);

  fs.writeFileSync(filePath, JSON.stringify(backup, null, 2));

  res.download(filePath);
});

app.listen(PORT, () => {
  console.log(`Floraria online rulează pe http://localhost:${PORT}`);
});