<?php
$servername = "193.203.168.121";
$username = "u402158123_saminew2025";  // Your DB username
$password = "Sami@2025";              // Your DB password
$database = "u402158123_event_manage"; // Your DB name

$conn = new mysqli($servername, $username, $password, $database);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
?>
