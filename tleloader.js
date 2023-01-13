/* TLELOADER.JS / JoEmbedded */
// Info about TLE: https://en.wikipedia.org/wiki/Two-line_element_set
// Original Source: https: celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle

import * as SAT from "./modules/satellite.min.js"


export var SatList = [] // Contains Satrecs of ALL available LEO Sats
export var SelSatList = [] // List of Selected Sats

// Debug-Terminal
var MAXTERM = 100 // Lines for Terminal
var terminalContent = []
function Terminal(txt, flush = true) {
    while (terminalContent.length > MAXTERM) terminalContent.shift()
    terminalContent.push(txt)
    if(flush){
        const h = document.getElementById('id_txt').innerText = terminalContent.join(' | ')
    }
}

// --- Functions ---
async function fetchData(file) { // ATTENTION: Fetch only via HTTP
    try {
        let response = await fetch(file)
        if (response.status === 200) {
            let data = await response.text()
            return data;
        } else throw "File: '" + file + "': " + response.status + ": " + response.statusText
    } catch (err) { // Catch e.g. CORS Errors
        return "ERROR: " + err // 'ERROR: Magic first word
    }
}

const MinutesPerDay = 1440;
const ixpdotp = MinutesPerDay / (2.0 * 3.141592654)                     

/* Load List of all currently active LEO Satellites */
export async function loadTLEList() {
    // Original Source: https: celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle
    const res = await fetchData('./data/tledata.txt') // Load global TLE List
    if (res.startsWith('ERROR: ')) {
        alert("\u274C ERROR:\nNo TLE Data found.\nReason: '" + res.substring(7) +
            "'")
    } else {
        SatList = []
        try {
            var tmplist = res.split("\n")
            for (let i = 0; i < tmplist.length; i += 3) {
                let hname = tmplist[i].trim()
                let hl0 = tmplist[i + 1].trim()
                let hl1 = tmplist[i + 2].trim()
                if (hname.length && hl0.startsWith('1') && hl1.startsWith('2')) {
                    const sr = satellite.twoline2satrec(hl0, hl1);
                    if(sr.error) continue;  // Error in TLE-Data
                    const revsPerDay = sr.no * ixpdotp;
                    if(revsPerDay < 6.4) continue;  // A LEO St has per Def. <225 minutes per orbit!
                    const h = {
                        name: hname,    // name of Sat
                        sr: sr, // propagation satrec
                    }
                    SatList.push(h)
                }
            }
        } catch {}
    }
}

export function buildSelectedSatList(selmask){
    SelSatList = []
    SelSatList = SatList.filter((e) => e.name.toLowerCase().startsWith(selmask) )
    return SelSatList.length
}

export var Positions = [] // Aq. to SelSats - The Data

// Calculate current Positions
export function calcPositions(date = new Date()) {
    var Positions = []
    for (let i = 0; i < SelSatList.length; i++) {
        const satrec =  SelSatList[i].sr;
        const positionAndVelocity = satellite.propagate(satrec, date)
        const gmst = satellite.gstime(date)
        const position = satellite.eciToGeodetic(positionAndVelocity.position, gmst);
        const velocity = positionAndVelocity.velocity;
        const vtotal = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z)

        /*
        console.log("Name: ",SelSatList[i].name)
        console.log("Lng:", satellite.degreesLong(position.longitude).toFixed(3)); // p.l in radians
        console.log("Lat:", satellite.degreesLong(position.latitude).toFixed(3)); // p.l in radians
        console.log("Altitude(km):", position.height.toFixed(3)); 
        console.log("Speed(km/sec): "+vtotal.toFixed(3)); 
        */

        const hpos = {
            lng: position.longitude,
            lat: position.latitude,
            alt: position.height,
            speed: vtotal
        }
        Positions.push(hpos)
    }
}

/*
//--------- MAIN TEST ----------
async function tleSetup() {
    Terminal("=== TLELOADER.JS - App Ready ===")
    Terminal("Loading TLE Data...")
    await loadTLEList()
    Terminal("OK, Analyze...")
    //SatList.forEach((e)=>Terminal(e.name,false)) // no FLush
    Terminal("SatList Data OK " + SatList.length)
    var res = buildSelectedSatList("astrocast");
    //SelSatList.forEach((e)=>Terminal(e.name,false)) // no FLush
    Terminal("SelSatList Data OK " + res)
    calcPositions();    // NOW

}
window.addEventListener("load", tleSetup)
*/




/****/