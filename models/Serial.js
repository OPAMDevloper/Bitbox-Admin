const mongoose = require('mongoose');

const serialNumberSchema = new mongoose.Schema({
    serialNumber: { type: String, required: false },
    modelNumber: { type: String, required: false },
    testedBy: { type: String, required: false },
    uploadedFile: { type: String, required: false },
    processor: { type: String, required: false },
    motherboard: { type: String, required: false },
    RAM1: { type: String, required: false },
    RAM2: { type: String, required: false },
    RAM3: { type: String, required: false },
    RAM4: { type: String, required: false },
    HDD1: { type: String, required: false },
    HDD2: { type: String, required: false },
    SSD_SATA: { type: String, required: false },
    SSD_NVMe: { type: String, required: false },
    WifiModule: { type: String, required: false },
    SoftwareApp: { type: String, required: false },
    AddOn: { type: String, required: false },
    GraphicCard: { type: String, required: false },
    BluetoothModule: { type: String, required: false },
    monitorSize: { type: String, required: false },
    operatingSystem: { type: String, required: false },
    keyboardMouseCombo: { type: String, required: false },
    dynamicFields: { type: Map, of: String }
});

const SerialNumber = mongoose.model('SerialNumber', serialNumberSchema);

module.exports = SerialNumber;
