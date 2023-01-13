# TLEDATA.TXT Download

This directory contains cached TLE data from https://celestrak.org/NORAD/elements/
(https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle)

Cache download to ./data: via (e.g. by CRON) 
TLE-Data are valid for at least several days

curl -o tledata.txt "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle"
 or
tleget.bat 

***