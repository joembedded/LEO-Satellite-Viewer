<?php
	error_reporting(E_ALL);
	header('Content-Type: text/plain');
	// TLE Data Loader - JoEmbedded.de
	// Run this as CRON Job e.g. each 1-2 days to cache TLE Data
	// (Jo Test: http://localhost/wrk/leoview/data/tleget.php )

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

	echo "*** 'tleget.php' - TLE Data Loader V1.1 - JoEmbedded.de ***\n";
	$xlog = "tleget.php: ";
	$curlurl = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle";
	$ch = curl_init($curlurl);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	$result = curl_exec($ch);
	if (curl_errno($ch)){
		$xlog .= '(ERROR: Curl:' . curl_error($ch) . ')';
		curl_close($ch);
	}else{
		curl_close($ch);
		$rlen = strlen($result);
		if($rlen<10000){
			$xlog .= '(ERROR: LEN:$rlen)';
		}else{
			@unlink("tledata_bak.txt"); // Keep a backup
			rename("tledata.txt","tledata_bak.txt");
			file_put_contents("tledata.txt",$result);
			echo "OK. $rlen Bytes read.\n";
			$xlog .= "($rlen Bytes read)";
		}
	}

	$mtrun = round((microtime(true) - $mtmain_t0) * 1000, 4);
	$xlog .= "(Run:$mtrun msec)"; // Script Runtime
	echo "Log: '$xlog'\n";
	addlog($xlog); // Regular exit, entry in logfile should be first
?>