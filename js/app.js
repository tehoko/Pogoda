function applyCss(rules) {
    let styleElem = document.createElement("style");
    styleElem.type = "text/css";
    if (styleElem.styleSheet) styleElem.styleSheet.cssText = rules;
    else styleElem.innerHTML = rules;
    document.head.appendChild(styleElem);
}

function insertDomBefore(newNode, referenceNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode)
}

function insertDomAfter(newNode, referenceNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

function roundToTwo(number) {
    return +(Math.round(number + "e+2") + "e-2");
}

function getClassForSunday(day) {
    const sundays = getSundays();
    const target = getCorrectedDay(day.time * 1000).toISOString().substring(0, 10);
    let match;
    for (let sunday of sundays) {
        if (new Date(sunday.date).toISOString().substring(0, 10) === target) {
            match = sunday;
            break;
        }
    }
    return match ? (match.open ? "shops-open" : "shops-closed") : "shops-undefined";
}

function isSunday(day) {
    return getCorrectedDay(day.time * 1000).getDay() === 0;
}

function getCorrectedDay(day) {
    return new Date(new Date(day).getTime() - (new Date(day).getTimezoneOffset() * 60000));
}

function areDatesEqual(one, two) {
    return (one.toISOString().slice(0,10) === two.toISOString().slice(0,10));
}

function timestampToShortDate(timestamp) {
    const date = getCorrectedDay(new Date(timestamp * 1000));
    const now = getCorrectedDay(new Date());
    if (areDatesEqual(date, now))
        return "Dziś";
    const months = [ "Sty", "Lut", "Mar", "Kwi", "Maj", "Cze",
                     "Lip", "Sie", "Wrz", "Paź", "Lis", "Gru" ];
    return date.getDate() + " " + months[date.getMonth()];
}

function timestampToDayName(timestamp) {
    const day = getCorrectedDay(new Date(timestamp * 1000));
    let names = [];
    names[0] = "Nd"; names[1] = "Pn"; names[2] = "Wt"; names[3] = "Śr";
    names[4] = "Cz"; names[5] = "Pt"; names[6] = "Sb";
    return names[day.getDay()];
}

function generateIcon(day, size=64) {
    let icon = document.createElement("canvas");
    icon.width = icon.height = size;
    let skycons = new Skycons(skyconsColors());
    skycons.add(icon, day.icon);
    skycons.play();
    return icon;
}

function generateSpan(className, content) {
    let span = document.createElement("span");
    span.classList.add(className);
    span.innerHTML = content;
    return span;
}

function generateSummary(day) {
    return generateSpan("summary", day.summary);
}

function generateTemperatureBar(day, temperatureRange) {
    const rangeMin = temperatureRange[0];
    const tempMin = Math.round(day.temperatureMin);
    const tempMax = Math.round(day.temperatureMax);
    const colorant = new TemperatureColorant();

    let bar = document.createElement("span");
    bar.classList.add("bar");
    bar.classList.add(`day-${day.time}`);
    bar.setAttribute("temp-min", tempMin);
    bar.setAttribute("temp-max", tempMax);
    const columnStart = 1 + tempMin - rangeMin;
    const columnEnd = columnStart + tempMax - tempMin;
    bar.style.gridArea = `1 / ${columnStart} / -1 / ${columnEnd}`;
    bar.style.background = colorant.gradient(tempMin, tempMax);
    applyCss(`.day-${day.time}:before { color: ${darken(colorant.colorOf(tempMin), 0.2).hex}; }
.day-${day.time}:after  { color: ${darken(colorant.colorOf(tempMax), 0.2).hex}; }`);

    let container = document.createElement("div");
    container.classList.add("temperature-range");
    container.appendChild(bar);

    return container;
}

function appendWeatherBox(day, tempMinMax) {
    let box = document.createElement("div");
    box.classList.add("info-box");
    if (isSunday(day))
        box.classList.add(getClassForSunday(day));
    box.appendChild(generateIcon(day, 64));
    box.appendChild(generateTemperatureBar(day, tempMinMax));
    box.setAttribute("day-of-week", timestampToDayName(day.time));
    box.setAttribute("day-of-month", timestampToShortDate(day.time));
    document.body.appendChild(box);
}

function getTemperatureRange(daily) {
    let min = 1000;
    let max = -1000;
    for (let day of daily) {
        if (day.temperatureMin < min) min = day.temperatureMin;
        if (day.temperatureMax > max) max = day.temperatureMax;
    }
    return [ Math.round(min), Math.round(max) ];
}

function getAirlyMeasurements() {
    const level = airly.current.indexes[0].level.replace(/_/g, "-").toLowerCase();
    const value = airly.current.indexes[0].value;
    const pm25 = airly.current.standards.filter(x => x.pollutant === "PM25")[0].percent;
    const pm10 = airly.current.standards.filter(x => x.pollutant === "PM10")[0].percent;
    return [ level, value, Math.round(pm25), Math.round(pm10) ];
}

function appendPollutantBar(rootNode, pollutant, percentage) {
    let name = document.createElement("span");
    name.classList.add("name");
    name.classList.add("pollutant");
    name.setAttribute("pollutant", pollutant);
    name.innerHTML = pollutant;

    let fill = document.createElement("span");
    fill.classList.add("bar");
    fill.classList.add("pollutant");
    fill.setAttribute("pollutant", pollutant);
    fill.style.width = Math.min(percentage, 100) + "%";

    let bg = document.createElement("span");
    bg.classList.add("bg");
    bg.classList.add("pollutant");
    bg.setAttribute("pollutant", pollutant);

    let value = document.createElement("span");
    value.classList.add("percentage");
    value.classList.add("pollutant");
    value.setAttribute("pollutant", pollutant);
    value.innerHTML = percentage + "%";

    rootNode.appendChild(name);
    rootNode.appendChild(fill);
    rootNode.appendChild(bg);
    rootNode.appendChild(value);
}

function generateAir() {
    const [ level, value, pm25percent, pm10percent ] = getAirlyMeasurements();
    
    let air = document.createElement("div");
    air.classList.add("air-quality");
    air.style.background = new AirPollutionColorant().colorOf(value).hex;
    
    let index = document.createElement("span");
    index.classList.add("value");
    index.innerHTML = Math.round(value);
    
    air.appendChild(index);
    appendPollutantBar(air, "PM2.5", pm25percent);
    appendPollutantBar(air, "PM10", pm10percent);

    return air;
}

function generateHourlyBar(hourly) {
    const maxRange = Math.min(24, hourly.data.length)
    let bar = document.createElement("div");
    bar.classList.add("hourly-bar");
    bar.style.gridTemplateColumns = `repeat(${maxRange}, 1fr)`;
    
    let previousStatus = "";
    let previousEnd = 0;
    for (let index = 0; index <= maxRange; index++) {
        const hour = hourly.data[index];
        let start;
        let end;
        const status = hour ? hour.icon.replace(/\-(night|day)/g, "") : "";

        if ((previousStatus && (previousStatus != status)) || (index === maxRange)) {
            start = previousEnd + 1;
            end = index + 1;

            let block = document.createElement("div");
            block.classList.add(previousStatus);
            block.style.gridColumn = `${start} / ${end}`;
            bar.appendChild(block);

            previousEnd = index;
        }
        previousStatus = status;
    }
    
    return bar;
}

function generateCurrentWeather() {
    let box = document.createElement("div");
    box.classList.add("weather");

    let icon = generateIcon(darksky.currently, 128);

    let temperature = document.createElement("span");
    temperature.classList.add("temperature");
    let temperatureValue = document.createElement("span");
    temperatureValue.innerHTML = Math.round(darksky.currently.temperature);
    temperature.appendChild(temperatureValue);

    let summary = generateSummary(darksky.currently);
    
    let hourlyBar = generateHourlyBar(darksky.hourly);

    box.appendChild(icon);
    box.appendChild(temperature);
    box.appendChild(summary);
    box.appendChild(hourlyBar);

    return box;
}

function generateMainInfo() {
    let container = document.createElement("div");
    container.classList.add("info-box");
    container.classList.add("current");
    container.setAttribute("day-of-week", "teraz");
    container.appendChild(generateCurrentWeather());
    container.appendChild(generateAir());
    document.body.appendChild(container);
}

function generateDailyWeather() {
    const daily = darksky.daily.data;
    const tempMinMax = getTemperatureRange(daily);
    for (let day of daily) {
        appendWeatherBox(day, tempMinMax);
    }
    const range = tempMinMax[1] - tempMinMax[0];
    applyCss(`.temperature-range { grid-template-columns: repeat(${range}, 1fr); }`);
}

function generateFooter() { // !!!
}

function init() {
    generateMainInfo();
    generateDailyWeather();
    generateFooter();
}

if (document.readyState != "loading")
    init();
else if (document.addEventListener)
    document.addEventListener("DOMContentLoaded", init);
else
    document.attachEvent("onreadystatechange", function() {
        if (document.readyState == "complete")
            init();
    });