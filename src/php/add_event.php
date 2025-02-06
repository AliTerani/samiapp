<?php
header('Content-Type: application/json');

// Database connection
$servername = "193.203.168.121";
$username = "u402158123_saminew2025"; // Replace with your database username
$password = "Sami@2025"; // Replace with your database password
$dbname = "u402158123_event_manage"; // Replace with your database name

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
  die(json_encode(["success" => false, "message" => "Connection failed: " . $conn->connect_error]));
}

// Log received data for debugging
error_log("Received POST data: " . print_r($_POST, true));
error_log("Received FILES data: " . print_r($_FILES, true));

// Handle file upload
if (isset($_FILES["event_image"]) && $_FILES["event_image"]["error"] == UPLOAD_ERR_OK) {
  $target_dir = "public/images/";
  $target_file = $target_dir . basename($_FILES["event_image"]["name"]);
  $imageFileType = strtolower(pathinfo($target_file, PATHINFO_EXTENSION));

  // Check if image file is a valid image
  $check = getimagesize($_FILES["event_image"]["tmp_name"]);
  if ($check === false) {
    echo json_encode(["success" => false, "message" => "File is not an image."]);
    exit;
  }

  // Check if file already exists
  if (file_exists($target_file)) {
    echo json_encode(["success" => false, "message" => "File already exists."]);
    exit;
  }

  // Check file size (max 5MB)
  if ($_FILES["event_image"]["size"] > 5000000) {
    echo json_encode(["success" => false, "message" => "File is too large."]);
    exit;
  }

  // Allow only certain file formats
  if ($imageFileType != "jpg" && $imageFileType != "png" && $imageFileType != "jpeg" && $imageFileType != "gif") {
    echo json_encode(["success" => false, "message" => "Only JPG, JPEG, PNG & GIF files are allowed."]);
    exit;
  }

  // Upload the file
  if (!move_uploaded_file($_FILES["event_image"]["tmp_name"], $target_file)) {
    echo json_encode(["success" => false, "message" => "Error uploading file."]);
    exit;
  }
} else {
  echo json_encode(["success" => false, "message" => "No file uploaded or file upload error."]);
  exit;
}

// Get form data
$event_name = $_POST['event_name'];
$event_location = $_POST['event_location'];
$event_country = $_POST['event_country'];
$start_date = $_POST['start_date'];
$end_date = $_POST['end_date'];
$opening_balance = $_POST['opening_balance'];
$opening_balance_currency = $_POST['opening_balance_currency'];
$camira_price = $_POST['camira_price'];
$camira_currency = $_POST['camira_currency'];
$mobile_price = $_POST['mobile_price'];
$mobile_currency = $_POST['mobile_currency'];

// Handle multi-date showtimes
$showtimes = [];
foreach ($_POST as $key => $value) {
  if (strpos($key, 'showtimes_') === 0) {
    $date = substr($key, 10); // Extract date from the key
    $showtimes[$date] = $value;
  }
}

// Insert event data into the database
$sql = "INSERT INTO events (
  event_image, event_name, event_location, event_country, start_date, end_date, 
  opening_balance, opening_balance_currency, camira_price, camira_currency, 
  mobile_price, mobile_currency, showtimes, selected_actors
) VALUES (
  '$target_file', '$event_name', '$event_location', '$event_country', '$start_date', '$end_date', 
  '$opening_balance', '$opening_balance_currency', '$camira_price', '$camira_currency', 
  '$mobile_price', '$mobile_currency', '" . json_encode($showtimes) . "', '" . json_encode($selected_actors) . "'
)";

if ($conn->query($sql) === TRUE) {
  echo json_encode(["success" => true, "message" => "Event created successfully!"]);
} else {
  echo json_encode(["success" => false, "message" => "Error: " . $sql . "<br>" . $conn->error]);
}

$conn->close();
?>
