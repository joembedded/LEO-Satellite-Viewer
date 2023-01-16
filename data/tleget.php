<?php
	header('Content-Type: text/plain');
	// TLE Data Loader - JoEmbedded.de
	echo "*** 'tleget.php' - TLE Data Loader V1.0 - JoEmbedded.de ***\n";
	$curlurl = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle";
	$ch = curl_init($curlurl);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	$result = curl_exec($ch);
	if (curl_errno($ch)){
		echo "ERROR: '".curl_error($ch)."'\n";
		exit();
	}
	curl_close($ch);
	if(strlen($result)<10000){
		echo "ERROR: Len<1000:\n";
		echo $result;
		exit();
	}
	file_put_contents("tledata.txt",$result);
	echo "OK. ".strlen($result)." Bytes read.\n";
?>