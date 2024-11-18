let pretrainingdata;
let trainingdata = [];
const cities = ["Adelaide", "Melbourne", "Brisbane", "Perth", "Sydney"];
const buildingTypes = ["House", "Apartment", "Townhouse"];
const button = document.getElementById("enterInput")
const buttonleft = document.getElementById("leftButton")
buttonleft.addEventListener("click", decreaseListItem)
const buttonright = document.getElementById("rightButton")
buttonright.addEventListener("click", increaseListItem)
button.addEventListener("click", runInput);
let city, homeType, yearBuilt, lotArea, squarefootage, numBedrooms, numBathrooms, previousHouses = [], currentIndex = 0, numOfIndices = 0
let placeholder = localStorage.getItem('previousHouses')
if (placeholder){
    previousHouses = JSON.parse(placeholder)
    numOfIndices = previousHouses.length 
    console.log(numOfIndices)
}
function encodeCity(city) {
    return cities.map(c => (c === city ? 1 : 0));
}
function encodeBuildingType(type) {
    return buildingTypes.map(t => (t === type ? 1 : 0));
}
fetch('data.csv')
    .then(response => response.text())
    .then(csvData => {
        Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            complete: function (results) {
                console.log(results.data);
                pretrainingdata = results.data;
                formatTrainingData();
            }
        });
    })
    .catch(error => console.error('Error fetching CSV:', error));

function formatTrainingData() {
    for (let i = 0; i < pretrainingdata.length; i++) {
        let input = [
            Number(pretrainingdata[i].Bathrooms),
            Number(pretrainingdata[i].Bedrooms),
            ...encodeCity(pretrainingdata[i].City),
            Number(pretrainingdata[i].Lot_Area),
            Number(pretrainingdata[i].SqFt),
            ...encodeBuildingType(pretrainingdata[i].Type),
            Number(pretrainingdata[i].Year_Built)
        ];

        let output = [Number(pretrainingdata[i].Price) ];
        trainingdata.push({ input, output });
    }
    
}   

async function trainMachineLearning() {
    const model = tf.sequential();
    model.add(tf.layers.dense({ inputShape: [13], units: 32, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'linear' }));
    //the relu function is sets it so that it is a rectifer neural network. So it calculates the output for a node depending on individual inputs and their weights etc 
    model.compile({
        optimizer: tf.train.adam(),
        loss: 'meanSquaredError',
        metrics: ['mae']
    });

    const inputs = tf.tensor2d(trainingdata.map(d => d.input));
    const outputs = tf.tensor2d(trainingdata.map(d => d.output));

    await model.fit(inputs, outputs, {
        epochs: 10,
        callbacks: {
            onEpochEnd: (epoch, logs) => console.log(`Epoch ${epoch}: loss = ${logs.loss}`)
        }
    });

    
   
    model.save('localstorage://my-model');
    return model
}

async function loadModel() {
    try {
        const model = await tf.loadLayersModel('localstorage://my-model');
        console.log("Loaded Model from local Storage");
        return model;
    } catch (error) {
        console.log("No model found. Training new Neural Network");
        const model = await trainMachineLearning()
        return model;
    }
}

async function runPrediction(model) {
    const input = tf.tensor2d([[numBathrooms, numBedrooms, ...encodeCity(city), lotArea, squarefootage, ...encodeBuildingType(homeType), yearBuilt]]);
    const prediction = model.predict(input);
    prediction.array().then(value => {
        const predictedPrice = value[0][0];
        document.getElementById("output").innerHTML = "Predicted price: $" + parseInt(predictedPrice);
        previousHouses.push({
            'numBathrooms':numBathrooms,
            'numBedrooms':numBedrooms,
            'city':city,
            'lotArea':lotArea,
            'squarefootage':squarefootage,
            'homeType':homeType,
            'yearBuilt':yearBuilt,
            'predictedPrice':parseInt(predictedPrice)
            
        })
        localStorage.setItem('previousHouses', JSON.stringify(previousHouses));
        console.log(previousHouses)
    });
}

function runInput(){
    city = document.getElementById('cityPicker').value;
    homeType = document.getElementById('type').value;
    numBedrooms = Number(document.getElementById('bedroomNumber').value);
    numBathrooms = Number(document.getElementById('bathroomNumber').value);
    yearBuilt = Number(document.getElementById('year').value);
    lotArea = Number(document.getElementById('lotArea').value);
    squarefootage = Number(document.getElementById('SquareFoot').value);

   if (city&&homeType&&numBathrooms&&numBathrooms&&numBedrooms&&yearBuilt&&lotArea)
    loadModel().then(model => {
        runPrediction(model);  
    });   
}
function decreaseListItem(){
    // console.log("left")
}
function increaseListItem(){
    // console.log("right")
}