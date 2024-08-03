const mongoose = require('mongoose');

const resellerSchema = new mongoose.Schema({
    // name: { type: String, required: false },
    companyName: { type: String, required: false },
    businessAddress: { type: String, required: false },
    city: { type: String, required: false },
    state: { type: String, required: false },
    contactPersonName: { type: String, required: false },
    contactPersonDesignation: { type: String, required: false },
    contactPersonEmail: { type: String, required: false },
    contactPersonPhone: { type: String, required: false },
    businessProfile: { type: String, required: false },
    typeOfBusiness: { type: String, required: false },
    yearOfEstablishment: { type: String, required: false },
    gstNumber: { type: String, required: false },
    gstCertificate: { type: String, required: false },
    panNumber: { type: String, required: false },
    panCard: { type: String, required: false },
    msmeCertificate: { type: String },
    certificationsAffiliations: { type: String },
    briefDescription: { type: String, required: false },
    typeOfIndustry: { type: String, required: false },
    prominentClients: { type: String, required: false },
    experienceExpertise: { type: String, required: false },
    brandsDealtWith: { type: String, required: false },
    branchLocations: { type: String },
    warehouseFacilities: { type: String },
    technicalSupportStaff: { type: String },
    annualTurnover: { type: String, required: false },
    plStatement: { type: String, required: false },
    lastYearBusinessValue: { type: String },
    bankDetails: { type: String, required: false },
    gemSellerId: { type: String },
    gemSellerIdScreenshot: { type: String },
    gemSellerRating: { type: String },
    // authorizationRegions: { type: [String], required: false },
    additionalInfo: { type: String },
    bitboxAccountManager: { type: String },
    declarationForm: { type: String, required: false },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
});

module.exports = mongoose.model('Reseller', resellerSchema);
