const http = require("http");
const fs = require("fs");
const requests = require("requests");
const express = require("express");
const seqpulse = require("seqpulse")

const app = express();

const homeFile = fs.readFileSync("home.html", "utf-8");

const replaceVal = (tempVal, originalVal) => {
    const temperature = originalVal.main.temp;
    const minTemp = originalVal.main.temp_min;
    const maxTemp = originalVal.main.temp_max;

    let output = tempVal.replace("{%CityName%}", originalVal.name);
    output = output.replace("{%tempVal%}", temperature.toFixed(1));
    output = output.replace("{%tempStatus%}", originalVal.weather[0].main);
    output = output.replace("{%tempMin%}", minTemp.toFixed(1));
    output = output.replace("{%tempMax%}", maxTemp.toFixed(1));

    return output;
};

// Initialiser SeqPulse
seqpulse.init({
  endpoint: "/seqpulse_metrics",
  hmacEnabled: false,  // Désactivé pour le test
});

// Routes de l'app
app.get("/", (req, res) => {
  res.send("Mon app de test");
});

// Endpoint metrics (exposé par le SDK)
app.use(seqpulse.metrics());

const server = http.createServer((req, res) => {

    if (req.url === "/") {

        const apiKey = "edfb86d3e4c065f008fd69c66c677434";

        const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=Paris&units=metric&appid=${apiKey}`;

        let data = "";

        requests(apiUrl)

            .on("data", (chunk) => {
                data += chunk;
            })

            .on("end", (err) => {

                if (err) {
                    console.log("connection closed due to errors", err);
                    res.end();
                    return;
                }

                const ObjData = JSON.parse(data);

                if (!ObjData.main) {
                    res.write("API error: " + JSON.stringify(ObjData));
                    res.end();
                    return;
                }

                const arrData = [ObjData];

                const realTimeData = arrData
                    .map((val) => replaceVal(homeFile, val))
                    .join("");

                res.write(realTimeData);
                res.end();
            });
    }

});

const PORT = process.env.PORT || 4000; // ok
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});