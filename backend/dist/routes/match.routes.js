"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const match_controller_1 = require("../controllers/match.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.post('/candidatos', auth_middleware_1.authenticate, match_controller_1.matchCandidatos);
router.post('/ofertas', auth_middleware_1.authenticate, match_controller_1.matchOfertas);
exports.default = router;
