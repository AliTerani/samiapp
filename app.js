const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const mysql = require("mysql"); // Import MySQL module

const app = express();

// Middleware to parse JSON and serve static files
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
// Serve static files from the 'receipts' directory
app.use('/receipts', express.static(path.join(__dirname, 'receipts')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "public", "images");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

// Database connection
const db = mysql.createConnection({
  host: "193.203.168.121",
  user: "u402158123_saminew2025", // Replace with your database username
  password: "Sami@2025", // Replace with your database password
  database: "u402158123_event_manage", // Replace with your database name
});

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error("Error connecting to the database:", err);
    return;
  }
  console.log("Connected to the database");
});

// Dummy credentials
const USERS = { admin: "admin123", user: "user123" };

// Serve login page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Handle login POST request
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (USERS[username] && USERS[username] === password) {
    res.send({ success: true, message: `Welcome, ${username}!` });
  } else {
    res.status(401).send({ success: false, message: "Invalid credentials" });
  }
});

// Handle event submission
app.post('/add-event', upload.single("event_image"), async (req, res) => {
  try {
    const {
      event_name,
      event_location,
      event_country,
      start_date,
      opening_balance,
      opening_balance_currency,
      camira_price,
      camira_currency,
      mobile_price,
      mobile_currency,
      producer_percentage,
      actors_percentage,
      photograph_percentage,
      showtimes,
      selected_actors, // This should be a JSON string
      receipt_print, // Add this
      queue, // Add this
    } = req.body;

    // Fetch actors from the database
    const actors = await new Promise((resolve, reject) => {
      const sql = "SELECT * FROM actors";
      db.query(sql, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });

    // Parse the selected_actors data
    let selectedActors = [];
    try {
      selectedActors = JSON.parse(selected_actors);
    } catch (error) {
      console.error("Error parsing selected_actors:", error);
      return res.status(400).send({ success: false, message: "Invalid selected_actors data." });
    }

    // Format the selected_actors data to match the desired structure
    const formattedActors = selectedActors.map(actorId => {
      const actor = actors.find(a => a.id === actorId);
      if (!actor) {
        throw new Error(`Actor with ID ${actorId} not found.`);
      }
      return {
        id: actor.id,
        actor_image: actor.actor_image,
        actor_name: actor.actor_name,
        currency: camira_currency, // Assuming the currency is the same for all actors
        camira_price: parseFloat(camira_price),
        mobile_price: parseFloat(mobile_price),
      };
    });

     // Convert checkbox values to boolean (1 or 0)
    const receiptPrintValue = receipt_print === '1' ? 1 : 0;
    const queueValue = queue === '1' ? 1 : 0; 
    // Insert data into the database
    const sql = `
      INSERT INTO events (
        event_image, event_name, event_location, event_country, start_date,
        opening_balance, opening_balance_currency, camira_price, camira_currency,
        mobile_price, mobile_currency, producer_percentage, actors_percentage, photograph_percentage,
        showtimes, selected_actors, receipt_print, queue
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      req.file ? req.file.filename : null, // event_image
      event_name,
      event_location,
      event_country,
      start_date,
      opening_balance,
      opening_balance_currency,
      camira_price,
      camira_currency,
      mobile_price,
      mobile_currency,
      producer_percentage,
      actors_percentage,
      photograph_percentage,
      showtimes, // Add this field
      JSON.stringify(formattedActors), // Add this field (formatted actors)
      receiptPrintValue, // Use the converted value
      queueValue, // Use the converted value
    ];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Error inserting data into the database:", err);
        res.status(500).send({ success: false, message: "An error occurred while adding the event." });
        return;
      }
      //console.log(req.body);
      res.send({ success: true, message: "Event added successfully!" });
    });
  } catch (error) {
    console.error("Error adding event:", error);
    res.status(500).send({ success: false, message: "An error occurred while adding the event." });
  }
});

// Handle actor submission
app.post("/add-actor", upload.single("actor_image"), (req, res) => {
    try {
      // Extract form data
      const { actor_name, currency, camira_price, mobile_price } = req.body;
  
      // Insert data into the database
      const sql = `
        INSERT INTO actors (
          actor_image, actor_name, currency, camira_price, mobile_price
        ) VALUES (?, ?, ?, ?, ?)
      `;
  
      const values = [
        req.file ? `/images/${req.file.filename}` : null, // actor_image
        actor_name,
        currency,
        camira_price,
        mobile_price,
      ];
  
      db.query(sql, values, (err, result) => {
        if (err) {
          console.error("Error inserting data into the database:", err);
          res.status(500).send({ success: false, message: "An error occurred while adding the actor." });
          return;
        }
  
        res.send({ success: true, message: "Actor added successfully!" });
      });
    } catch (error) {
      console.error("Error adding actor:", error);
      res.status(500).send({ success: false, message: "An error occurred while adding the actor." });
    }
  });


// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Serve dashboard page after successful login
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// Serve add event form
app.get("/add-event-form", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "views", "addEventForm.html"));
});

// Serve Add Actors form
app.get("/add-actors-form", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "views", "addActorsForm.html"));
  });

// Add this route to fetch active events
app.get("/get-active-events", (req, res) => {
    const sql = "SELECT * FROM events WHERE status = 'Active'";
  
    db.query(sql, (err, results) => {
      if (err) {
        console.error("Error fetching active events:", err);
        res.status(500).send({ success: false, message: "Failed to fetch active events" });
        return;
      }
  
      res.send(results);
    });
  });

  // Fetch actors
app.get("/get-actors", (req, res) => {
    const sql = "SELECT * FROM actors";
  
    db.query(sql, (err, results) => {
      if (err) {
        console.error("Error fetching actors:", err);
        res.status(500).send({ success: false, message: "Failed to fetch actors" });
        return;
      }
  
      res.send(results);
    });
  });

  // Fetch event by ID
app.get('/get-event', (req, res) => {
    const eventId = req.query.id;
    const sql = "SELECT * FROM events WHERE id = ?";
  
    db.query(sql, [eventId], (err, results) => {
      if (err) {
        console.error("Error fetching event:", err);
        res.status(500).send({ success: false, message: "Failed to fetch event" });
        return;
      }
  
      if (results.length === 0) {
        res.status(404).send({ success: false, message: "Event not found" });
        return;
      }
  
      res.send(results[0]);
    });
  });



// Handle transaction submission
app.post('/add-transaction', (req, res) => {
    const transactionData = req.body;
  
    // Filter out actors with 0 Camira and 0 Mobile photos
    const validActors = transactionData.actors.filter(actor => 
      actor.camira_photos > 0 || actor.mobile_photos > 0
    );
  
    // If no valid actors are left, reject the transaction
    if (validActors.length === 0) {
      return res.status(400).send({ 
        success: false, 
        message: "Invalid transaction: At least one actor must have Camira or Mobile photos greater than 0." 
      });
    }
  
    // Generate a unique Transaction ID
    const eventId = transactionData.event_id;
    const showtime = transactionData.event_selected_showtime;
    const timestamp = Date.now(); // Current timestamp
    const transactionId = `TX-${eventId}-${showtime.replace(/:/g, '')}-${timestamp}`;
  
    // Get the current Queue Number for this event date and showtime
    const queueNumberSql = `
      SELECT COUNT(*) AS queue_count 
      FROM transactions 
      WHERE event_selected_date = ? AND event_selected_showtime = ?
    `;
  
    db.query(queueNumberSql, [transactionData.event_selected_date, transactionData.event_selected_showtime], (err, queueNumberResult) => {
      if (err) {
        console.error("Error fetching queue number:", err);
        return res.status(500).send({ success: false, message: "Failed to fetch queue number" });
      }
  
      const queueNumber = queueNumberResult[0].queue_count + 1; // Start from 1
  
      // Insert only valid actors into the database
      const sql = `
        INSERT INTO transactions (
          transaction_id, event_id, actor_id, camira_photos, mobile_photos, total_amount, 
          payment_method, cash_received, cash_refund, event_name, actor_name, 
          event_selected_date, event_selected_showtime, queue_number
        ) VALUES ?
      `;
  
      const values = validActors.map(actor => [
        transactionId, // Add the generated Transaction ID
        transactionData.event_id,
        actor.actor_id,
        actor.camira_photos,
        actor.mobile_photos,
        transactionData.total_amount,
        transactionData.payment_method,
        transactionData.cash_received,
        transactionData.cash_refund,
        transactionData.event_name,
        actor.actor_name,
        transactionData.event_selected_date,
        transactionData.event_selected_showtime,
        queueNumber, // Add the Queue Number
      ]);
  
      db.query(sql, [values], (err, result) => {
        if (err) {
          console.error("Error inserting transaction:", err);
          return res.status(500).send({ success: false, message: "Failed to add transaction" });
        }
  
        // If payment method is Cash, update the event's opening balance
        if (transactionData.payment_method === 'Cash') {
          const updateSql = "UPDATE events SET opening_balance = opening_balance + ? WHERE id = ?";
          db.query(updateSql, [transactionData.cash_received, transactionData.event_id], (err, result) => {
            if (err) {
              console.error("Error updating event opening balance:", err);
              return res.status(500).send({ success: false, message: "Failed to update event opening balance" });
            }
  
            // Generate receipts for each valid actor
            generateReceiptsForActors(validActors, transactionData, transactionId, queueNumber, res);
          });
        } else {
          // Generate receipts for each valid actor
          generateReceiptsForActors(validActors, transactionData, transactionId, queueNumber, res);
        }
      });
    });
  });

  async function generateReceiptsForActors(validActors, transactionData, transactionId, queueNumber, res) {
    try {
      // Generate receipts for each actor
      for (const actor of validActors) {
        const actorTransactionData = {
          ...transactionData,
          actors: [actor], // Only include the current actor
          transaction_id: transactionId,
          queue_number: queueNumber,
        };
  
        // Generate the receipt for the current actor
        const receiptResponse = await fetch('http://localhost:3000/generate-receipts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactionData: actorTransactionData,
          }),
        });
  
        if (!receiptResponse.ok) throw new Error('Failed to generate receipt');
      }
  
      // Send success response after all receipts are generated
      res.send({ 
        success: true, 
        message: "Transaction completed successfully!", 
        transactionId, 
        queueNumber 
      });
    } catch (error) {
      console.error('Error generating receipts:', error);
      res.status(500).send({ 
        success: false, 
        message: 'Transaction completed but failed to generate receipts' 
      });
    }
  }


  // Function to generate receipts
  async function generateReceipts(transactionData, transactionId, queueNumber, res) {
    try {
      // Generate main receipt
      const receiptResponse = await fetch('http://localhost:3000/generate-receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionData: {
            ...transactionData,
            transaction_id: transactionId,
            queue_number: queueNumber,
          },
        }),
      });
  
      if (!receiptResponse.ok) throw new Error('Failed to generate receipt');
  
      // Generate additional QR code receipt for Camira photos if applicable
      if (transactionData.camira_photos > 0) {
        const qrReceiptResponse = await fetch('http://localhost:3000/generate-receipts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactionData: {
              ...transactionData,
              transaction_id: transactionId,
              queue_number: queueNumber,
              camira_photos: transactionData.camira_photos,
            },
          }),
        });
  
        if (!qrReceiptResponse.ok) throw new Error('Failed to generate QR code receipt');
      }
  
      res.send({ success: true, message: "Transaction completed successfully!", transactionId, queueNumber });
    } catch (error) {
      console.error('Error generating receipts:', error);
      res.status(500).send({ success: false, message: 'Transaction completed but failed to generate receipts' });
    }
  }
  // Update event status to Archived
app.post('/archive-event', (req, res) => {
    const { eventId } = req.body;
  
    const sql = "UPDATE events SET status = 'Archived' WHERE id = ?";
    db.query(sql, [eventId], (err, result) => {
      if (err) {
        console.error("Error archiving event:", err);
        res.status(500).send({ success: false, message: "Failed to archive event" });
        return;
      }
  
      res.send({ success: true, message: "Event archived successfully!" });
    });
  });

  

  // Function to generate receipt HTML
  function generateReceiptHTML(transactionData) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Actor Photo Receipt</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          body {
            font-family: 'Inter', sans-serif;
          }
        </style>
      </head>
      <body class="bg-gray-100 flex items-center justify-center min-h-screen p-6">
        <div class="bg-white rounded-2xl shadow-lg overflow-hidden w-full max-w-md">
          <!-- Receipt Header -->
          <div class="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-center">
            <img src="public/images/samilogo.png" alt="Logo" class="w-24 h-24 mx-auto mb-4">
            <h1 class="text-2xl font-bold text-white">Photo Service Receipt</h1>
            <p class="text-sm text-blue-100 mt-2">Thank you for your purchase!</p>
          </div>
  
          <!-- Receipt Body -->
          <div class="p-6">
            <!-- Transaction Details -->
            <div class="space-y-4">
              <div class="flex justify-between">
                <span class="text-gray-600">Transaction ID:</span>
                <span class="font-semibold text-gray-800">${transactionData.transaction_id}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Event Name:</span>
                <span class="font-semibold text-gray-800">${transactionData.event_name}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Actor Name:</span>
                <span class="font-semibold text-gray-800">${transactionData.actors[0].actor_name}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Event Date:</span>
                <span class="font-semibold text-gray-800">${transactionData.event_selected_date}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Showtime:</span>
                <span class="font-semibold text-gray-800">${transactionData.event_selected_showtime}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Camira Photos:</span>
                <span class="font-semibold text-gray-800">${transactionData.actors[0].camira_photos}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Mobile Photos:</span>
                <span class="font-semibold text-gray-800">${transactionData.actors[0].mobile_photos}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Queue Number:</span>
                <span class="font-semibold text-gray-800">${transactionData.queue_number}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Payment Method:</span>
                <span class="font-semibold text-gray-800">${transactionData.payment_method}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Total Amount:</span>
                <span class="font-semibold text-blue-600">${transactionData.total_amount.toFixed(2)} KWD</span>
              </div>
            </div>
  
            <!-- QR Code Section -->
            <div class="mt-6 text-center">
              <div id="qrcode" class="mx-auto"></div>
              <p class="text-sm text-gray-500 mt-2">Scan this QR code for transaction details.</p>
            </div>
          </div>
  
          <!-- Receipt Footer -->
          <div class="bg-gray-50 p-4 text-center">
            <p class="text-sm text-gray-500">For any inquiries, please contact support@example.com</p>
            <p class="text-xs text-gray-400 mt-2">Transaction Date: ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
  
        <!-- QR Code Script -->
        <script src="https://cdn.jsdelivr.net/npm/qrcodejs/qrcode.min.js"></script>
        <script>
          new QRCode(document.getElementById("qrcode"), {
            text: "${transactionData.transaction_id}",
            width: 128,
            height: 128,
            colorDark: "#1E40AF", // Custom QR code color
            colorLight: "#ffffff", // Background color
          });
        </script>
      </body>
      </html>
    `;
  }

  // Serve the edit event form
app.get('/edit-event-form', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'views', 'editEventForm'));
  });


  const puppeteer = require('puppeteer');

  // Endpoint to generate and print receipts
  app.post('/generate-receipts', async (req, res) => {
    const { transactionData } = req.body;
  
    try {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
  
      // Generate HTML for the receipt
      const receiptHTML = generateReceiptHTML(transactionData);
  
      // Set the HTML content
      await page.setContent(receiptHTML, { waitUntil: 'networkidle0' });
  
      // Generate PDF or print
      if (process.env.PRINTER_AVAILABLE === 'true') {
        // Print directly if printer is available
        await page.pdf({ path: 'receipt.pdf', format: 'A4' });
        await page.emulateMediaType('print');
        await page.pdf({ path: 'receipt.pdf', format: 'A4' });
        await page.close();
        await browser.close();
  
        res.send({ success: true, message: 'Receipt printed successfully!' });
      } else {
        // Generate PDF if printer is not available
        await page.pdf({ path: 'receipt.pdf', format: 'A4' });
        await page.close();
        await browser.close();
  
        res.download('receipt.pdf', 'receipt.pdf', (err) => {
          if (err) {
            console.error('Error downloading receipt:', err);
            res.status(500).send({ success: false, message: 'Failed to download receipt' });
          }
        });
      }
    } catch (error) {
      console.error('Error generating receipt:', error);
      res.status(500).send({ success: false, message: 'Failed to generate receipt' });
    }
  });

  app.get('/get-archived-events', (req, res) => {
    const sql = "SELECT * FROM events WHERE status = 'Archived'";
  
    db.query(sql, (err, results) => {
      if (err) {
        console.error("Error fetching archived events:", err);
        res.status(500).send({ success: false, message: "Failed to fetch archived events" });
        return;
      }
  
      res.send(results);
    });
  });

  
  app.post('/update-event', upload.single("event_image"), (req, res) => {
    const eventId = req.query.id;
    const { event_name, event_location, event_country, start_date, end_date, status } = req.body;
  
    const sql = `
      UPDATE events 
      SET 
        event_name = ?, 
        event_location = ?, 
        event_country = ?, 
        start_date = ?, 
        end_date = ?, 
        status = ?
      WHERE id = ?
    `;
  
    const values = [event_name, event_location, event_country, start_date, end_date, status, eventId];
  
    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Error updating event:", err);
        res.status(500).send({ success: false, message: "Failed to update event" });
        return;
      }
  
      res.send({ success: true, message: "Event updated successfully!" });
    });
  });
  
  app.get('/get-report', (req, res) => {
    const { event_id, date, showtime } = req.query;
    
    const sql = `
        SELECT 
            e.event_name, e.opening_balance, 
            SUM(t.camira_photos) AS camira_total, 
            SUM(t.mobile_photos) AS mobile_total, 
            SUM(CASE WHEN t.payment_method = 'Cash' THEN t.total_amount ELSE 0 END) AS cash_total,
            SUM(CASE WHEN t.payment_method = 'Knet' THEN t.total_amount ELSE 0 END) AS knet_total,
            e.camira_price, e.mobile_price
        FROM transactions t
        JOIN events e ON t.event_id = e.id
        WHERE t.event_id = ? AND t.event_selected_date = ? AND t.event_selected_showtime = ?
        GROUP BY e.event_name;
    `;

    db.query(sql, [event_id, date, showtime], (err, results) => {
        if (err) {
            console.error("Error fetching report:", err);
            return res.status(500).send({ success: false, message: "Error fetching report" });
        }
        res.send(results[0]);
    });
});




const { exec } = require('child_process');



app.get('/generate-end-of-day-report', async (req, res) => {
  const { event_id, date, showtime } = req.query;

  const sql = `
    SELECT 
      e.event_name, e.camira_price, e.mobile_price, 
      SUM(t.camira_photos) AS camira_count,
      SUM(t.mobile_photos) AS mobile_count,
      SUM(CASE WHEN t.payment_method = 'Cash' THEN t.total_amount ELSE 0 END) AS cash_payment,
      SUM(CASE WHEN t.payment_method = 'Knet' THEN t.total_amount ELSE 0 END) AS knet_payment
    FROM transactions t
    JOIN events e ON t.event_id = e.id
    WHERE t.event_id = ? AND t.event_selected_date = ? AND t.event_selected_showtime = ?
    GROUP BY e.event_name, e.camira_price, e.mobile_price;
  `;

  db.query(sql, [event_id, date, showtime], async (err, results) => {
    if (err) {
      console.error('Error generating report:', err);
      return res.status(500).send({ success: false, message: 'Error generating report' });
    }

    if (results.length === 0) {
      return res.status(404).send({ success: false, message: 'No transactions found for the selected criteria.' });
    }

    const data = results[0];

    // Calculate totals
    const camiraAmount = data.camira_count * data.camira_price;
    const mobileAmount = data.mobile_count * data.mobile_price;
    const totalSale = data.cash_payment + data.knet_payment;

    // Define the HTML template with Google Fonts
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>تقرير نهاية اليوم</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;700&display=swap');
          body {
            font-family: 'Cairo', sans-serif;
            margin: 20px;
            padding: 20px;
            text-align: center;
          }
          .header {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
          }
          .line {
            border-top: 2px solid #ccc;
            margin: 10px 0;
          }
          .details {
            font-size: 16px;
            color: #555;
          }
          .section {
            font-size: 18px;
            font-weight: bold;
            margin-top: 10px;
          }
          .footer {
            font-size: 14px;
            color: #777;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">تقرير نهاية اليوم</div>
        <div class="details">📅 التاريخ: ${new Date().toLocaleDateString()}</div>
        <div class="line"></div>

        <div class="section">📌 تفاصيل الحدث</div>
        <div class="details">📅 التاريخ المحدد: ${date}</div>
        <div class="details">🎟️ اسم الحدث: ${data.event_name}</div>
        <div class="details">⏰ الوقت المحدد: ${showtime}</div>
        <div class="details">👤 الكاشير: المشرف</div>
        <div class="line"></div>

        <div class="section">💰 ملخص المعاملات</div>
        <div class="details">📷 صور الكاميرا: العدد: ${data.camira_count} | المبلغ: ${camiraAmount.toFixed(2)} KWD</div>
        <div class="details">📱 صور الموبايل: العدد: ${data.mobile_count} | المبلغ: ${mobileAmount.toFixed(2)} KWD</div>
        <div class="details">📊 الإجمالي: العدد: ${
          data.camira_count + data.mobile_count
        } | المبلغ: ${(camiraAmount + mobileAmount).toFixed(2)} KWD</div>
        <div class="line"></div>

        <div class="section">💳 ملخص الدفع</div>
        <div class="details">💵 الدفع نقداً: ${data.cash_payment.toFixed(2)} KWD</div>
        <div class="details">📦 الصندوق المغلق: ${data.cash_payment.toFixed(2)} KWD</div>
        <div class="details">💳 الدفع بالبطاقة: ${data.knet_payment.toFixed(2)} KWD</div>
        <div class="details">🛒 إجمالي المبيعات: ${totalSale.toFixed(2)} KWD</div>
        <div class="line"></div>

        <div class="footer">تم إنشاؤه بواسطة نظام اس فوتو جروب </div>
      </body>
      </html>
    `;

    // Generate the PDF using Puppeteer
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    const pdfPath = path.join(__dirname, 'receipts', `EndOfDay_${Date.now()}.pdf`);
    await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });

    await browser.close();

    // Print the PDF automatically
    exec(`lp ${pdfPath}`, (err, stdout, stderr) => {
      if (err) {
        console.error('Error printing receipt:', err);
        return res.status(500).send({ success: false, message: 'Failed to print the receipt.' });
      }

      console.log('Receipt sent to printer:', stdout);
      res.send({ success: true, message: 'Receipt generated and sent to the printer.' });
    });
  });
});



app.get('/generate-actors-request', async (req, res) => {
    const { event_id, date, showtime } = req.query;
  
    const sql = `
      SELECT e.event_name, a.actor_name, COUNT(*) AS total_shows
      FROM transactions a
      JOIN events e ON a.event_id = e.id
      WHERE a.event_id = ? AND a.event_selected_date = ? AND a.event_selected_showtime = ?
      GROUP BY e.event_name, a.actor_name
      ORDER BY a.actor_name ASC
    `;
  
    db.query(sql, [event_id, date, showtime], async (err, results) => {
      if (err) {
        console.error('Error generating actors request:', err);
        return res.status(500).send({ success: false, message: 'Error generating actors request' });
      }
  
      if (results.length === 0) {
        return res.status(404).send({ success: false, message: 'No actors found for the selected criteria.' });
      }
  
      // Get event name (same for all rows)
      const eventName = results[0].event_name;
  
      // Generate the actor list grouped by name
      const actorList = results
        .map((actor, index) => `
          <div class="actor-group">
            <span class="actor-name">${index + 1}. ${actor.actor_name}</span>
            <span class="actor-count">(${actor.total_shows} عروض)</span>
          </div>
        `)
        .join('');
  
      // Define the HTML template with Google Fonts
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>طلب الممثلين</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;700&display=swap');
            body {
              font-family: 'Cairo', sans-serif;
              margin: 20px;
              padding: 20px;
              text-align: center;
            }
            .header {
              font-size: 24px;
              font-weight: bold;
              color: #333;
              margin-bottom: 10px;
            }
            .line {
              border-top: 2px solid #ccc;
              margin: 10px 0;
            }
            .details {
              font-size: 16px;
              color: #555;
            }
            .section {
              font-size: 18px;
              font-weight: bold;
              margin-top: 10px;
            }
            .actor-group {
              font-size: 16px;
              font-weight: bold;
              color: #444;
              margin: 5px 0;
            }
            .actor-name {
              display: inline-block;
              width: 70%;
            }
            .actor-count {
              display: inline-block;
              width: 30%;
              text-align: left;
              color: #777;
            }
            .footer {
              font-size: 14px;
              color: #777;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header">طلب الممثلين</div>
          <div class="details">📅 التاريخ: ${new Date().toLocaleDateString()}</div>
          <div class="line"></div>
  
          <div class="section">📌 تفاصيل الحدث</div>
          <div class="details">🎭 اسم الحدث: ${eventName}</div>
          <div class="details">📅 التاريخ المحدد: ${date}</div>
          <div class="details">⏰ الوقت المحدد: ${showtime}</div>
          <div class="line"></div>
  
          <div class="section">🎭 قائمة الممثلين</div>
          ${actorList}
          <div class="line"></div>
  
          <div class="footer">تم إنشاؤه بواسطة نظام اس فوتو جروب </div>
        </body>
        </html>
      `;
  
      // Generate the PDF using Puppeteer
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      await page.setContent(htmlContent);
      const pdfPath = path.join(__dirname, 'receipts', `ActorsRequest_${Date.now()}.pdf`);
      await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });
  
      await browser.close();
  
      // Print the PDF automatically
      exec(`rundll32 SHELL32.DLL,ShellExec_RunDLL "${pdfPath}"`, (err, stdout, stderr) => {
        if (err) {
          console.error('Error printing Actors Request:', err);
          return res.status(500).send({ success: false, message: 'Failed to print the Actors Request.' });
        }
  
        console.log('Actors Request sent to printer:', stdout);
        res.send({ success: true, message: 'Actors Request generated and sent to the printer.' });
      });
    });
  });

  

app.get('/generate-event-date-report', async (req, res) => {
  const { event_id, date } = req.query;

  const sql = `
    SELECT e.event_name, t.actor_name, 
      SUM(t.camira_photos + t.mobile_photos) AS total_photos
    FROM transactions t
    JOIN events e ON t.event_id = e.id
    WHERE t.event_id = ? AND t.event_selected_date = ?
    GROUP BY e.event_name, t.actor_name
    ORDER BY t.actor_name ASC
  `;

  db.query(sql, [event_id, date], async (err, results) => {
    if (err) {
      console.error('Error generating Event Date Report:', err);
      return res.status(500).send({ success: false, message: 'Error generating Event Date Report' });
    }

    if (results.length === 0) {
      return res.status(404).send({ success: false, message: 'No transactions found for the selected event and date.' });
    }

    // Get event name (same for all rows)
    const eventName = results[0].event_name;

    // Calculate summary totals
    let totalQty = 0;
    let totalAmount = 0;
    let totalProduction = 0;
    let totalActor = 0;
    let totalPhoto = 0;

    const actorRows = results
      .map((row, index) => {
        const qty = row.total_photos;
        const price = 4; // Fixed price per photo
        const totalAmountRow = qty * price;
        const production = totalAmountRow * 0.375;
        const actor = totalAmountRow * 0.25;
        const photo = totalAmountRow * 0.375;

        // Update total summary
        totalQty += qty;
        totalAmount += totalAmountRow;
        totalProduction += production;
        totalActor += actor;
        totalPhoto += photo;

        return `
          <tr>
            <td>${index + 1}. ${row.actor_name}</td>
            <td>${qty}</td>
            <td>${price} KWD</td>
            <td>${totalAmountRow.toFixed(2)} KWD</td>
            <td>${production.toFixed(2)} KWD</td>
            <td>${actor.toFixed(2)} KWD</td>
            <td>${photo.toFixed(2)} KWD</td>
          </tr>
        `;
      })
      .join('');

    // Define the HTML template for the PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>تقرير تاريخ الحدث</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;700&display=swap');
          body { font-family: 'Cairo', sans-serif; margin: 20px; padding: 20px; text-align: center; }
          .header { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 10px; }
          .line { border-top: 2px solid #ccc; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .footer { font-size: 14px; color: #777; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">تقرير تاريخ الحدث</div>
        <div class="details">📅 التاريخ: ${new Date().toLocaleDateString()}</div>
        <div class="line"></div>

        <div class="details">🎭 اسم الحدث: ${eventName}</div>
        <div class="details">📅 التاريخ المحدد: ${date}</div>
        <div class="line"></div>

        <table>
          <tr>
            <th>الممثل</th>
            <th>الكمية</th>
            <th>السعر</th>
            <th>المبلغ الكلي</th>
            <th>٪ الإنتاج</th>
            <th>٪ الممثل</th>
            <th>٪ الصورة</th>
          </tr>
          ${actorRows}
        </table>

        <div class="line"></div>

        <table>
          <tr><th>المجموع</th><td>${totalQty}</td><td>-</td><td>${totalAmount.toFixed(2)} KWD</td><td>${totalProduction.toFixed(2)} KWD</td><td>${totalActor.toFixed(2)} KWD</td><td>${totalPhoto.toFixed(2)} KWD</td></tr>
        </table>

        <div class="footer">تم إنشاؤه بواسطة نظام اس فوتو جروب</div>
      </body>
      </html>
    `;

    // Generate PDF
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    const pdfPath = path.join(__dirname, 'receipts', `EventDateReport_${Date.now()}.pdf`);
    await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });

    await browser.close();

    res.send({ success: true, pdfPath: `/receipts/${path.basename(pdfPath)}` });
  });
});

app.get('/generate-event-full-report', async (req, res) => {
    const { event_id } = req.query;
  
    const sql = `
      SELECT e.event_name, t.actor_name, 
        SUM(t.camira_photos + t.mobile_photos) AS total_photos
      FROM transactions t
      JOIN events e ON t.event_id = e.id
      WHERE t.event_id = ?
      GROUP BY e.event_name, t.actor_name
      ORDER BY t.actor_name ASC
    `;
  
    db.query(sql, [event_id], async (err, results) => {
      if (err) {
        console.error('Error generating Event Full Report:', err);
        return res.status(500).send({ success: false, message: 'Error generating Event Full Report' });
      }
  
      if (results.length === 0) {
        return res.status(404).send({ success: false, message: 'No transactions found for the selected event.' });
      }
  
      // Get event name (same for all rows)
      const eventName = results[0].event_name;
  
      // Calculate summary totals
      let totalQty = 0;
      let totalAmount = 0;
      let totalProduction = 0;
      let totalActor = 0;
      let totalPhoto = 0;
  
      const actorRows = results
        .map((row, index) => {
          const qty = row.total_photos;
          const price = 4; // Fixed price per photo
          const totalAmountRow = qty * price;
          const production = totalAmountRow * 0.375;
          const actor = totalAmountRow * 0.25;
          const photo = totalAmountRow * 0.375;
  
          // Update total summary
          totalQty += qty;
          totalAmount += totalAmountRow;
          totalProduction += production;
          totalActor += actor;
          totalPhoto += photo;
  
          return `
            <tr>
              <td>${index + 1}. ${row.actor_name}</td>
              <td>${qty}</td>
              <td>${price} KWD</td>
              <td>${totalAmountRow.toFixed(2)} KWD</td>
              <td>${production.toFixed(2)} KWD</td>
              <td>${actor.toFixed(2)} KWD</td>
              <td>${photo.toFixed(2)} KWD</td>
            </tr>
          `;
        })
        .join('');
  
      // Define the HTML template for the PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>تقرير كامل للحدث</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;700&display=swap');
            body { font-family: 'Cairo', sans-serif; margin: 20px; padding: 20px; text-align: center; }
            .header { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 10px; }
            .line { border-top: 2px solid #ccc; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .footer { font-size: 14px; color: #777; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">تقرير كامل للحدث</div>
          <div class="details">📅 التاريخ: ${new Date().toLocaleDateString()}</div>
          <div class="line"></div>
  
          <div class="details">🎭 اسم الحدث: ${eventName}</div>
          <div class="line"></div>
  
          <table>
            <tr>
              <th>الممثل</th>
              <th>الكمية</th>
              <th>السعر</th>
              <th>المبلغ الكلي</th>
              <th>٪ الإنتاج</th>
              <th>٪ الممثل</th>
              <th>٪ الصورة</th>
            </tr>
            ${actorRows}
          </table>
  
          <div class="line"></div>
  
          <table>
            <tr><th>المجموع</th><td>${totalQty}</td><td>-</td><td>${totalAmount.toFixed(2)} KWD</td><td>${totalProduction.toFixed(2)} KWD</td><td>${totalActor.toFixed(2)} KWD</td><td>${totalPhoto.toFixed(2)} KWD</td></tr>
          </table>
  
          <div class="footer">تم إنشاؤه بواسطة نظام اس فوتو جروب </div>
        </body>
        </html>
      `;
  
      // Generate PDF
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      await page.setContent(htmlContent);
      const pdfPath = path.join(__dirname, 'receipts', `EventFullReport_${Date.now()}.pdf`);
      await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });
  
      res.send({ success: true, pdfPath: `/receipts/${path.basename(pdfPath)}` });
    });
  });
  
