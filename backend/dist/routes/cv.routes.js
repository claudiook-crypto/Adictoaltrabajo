"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const cv_controller_1 = require("../controllers/cv.controller");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
router.post('/parse', upload.single('cv'), cv_controller_1.parseCV);
router.post('/upload', upload.single('cv'), cv_controller_1.uploadCV);
router.post('/upload-image', upload.single('image'), cv_controller_1.uploadImage);
exports.default = router;
