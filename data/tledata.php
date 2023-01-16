<?php
	// CORS WRAPPER FOR TLEDATA
	header('Content-Type: text/plain');
	header('Access-Control-Allow-Origin: *');
	$data=file_get_contents("tledata.txt");
	echo $data;
?>