<?php
	error_reporting(E_ALL);
	// TLE Data Provider - JoEmbedded.de
	// Output cached data
	// (Jo Test: http://localhost/wrk/leoview/data/tledata.php )

	// --- Write alternating Logfiles ('.php' prevents readout) ---
	function addlog($xlog)
	{
		$logpath = "./";
		if (@filesize($logpath . "log.log.php") > 1000000) {	// Shift Logs
			@unlink($logpath . "_log_old.log.php");
			@rename($logpath . "log.log.php", $logpath . "_log_old.log.php");
			$xlog .= " ('log.log.php' -> '_log_old.log.php')";
		}
		$log = @fopen($logpath . "log.log.php", 'a');
		if ($log) {
			while (!flock($log, LOCK_EX)) usleep(10000);  // Lock File - Is a MUST
			fputs($log, gmdate("d.m.y H:i:s ", time()) . $_SERVER['REMOTE_ADDR']);        // Write file
			fputs($log, " $xlog\n");        // evt. add extras
			flock($log, LOCK_UN);
			fclose($log);
		}
	}

	// --- MAIN ---
	$mtmain_t0 = microtime(true);         // for Benchmark 
	$xlog = "tledata.php: ";

	// CORS WRAPPER FOR TLEDATA
	header('Content-Type: text/plain');
	header('Access-Control-Allow-Origin: *');
	$data=file_get_contents("tledata.txt");
	echo $data;
	
	$mtrun = round((microtime(true) - $mtmain_t0) * 1000, 4);
	$xlog .= "(Run:$mtrun msec)"; // Script Runtime
	addlog($xlog); // Regular exit, entry in logfile should be first
?>