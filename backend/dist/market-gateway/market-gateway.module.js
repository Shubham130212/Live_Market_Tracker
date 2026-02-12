"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketGatewayModule = void 0;
const common_1 = require("@nestjs/common");
const market_gateway_1 = require("./market.gateway");
const market_data_module_1 = require("../market-data/market-data.module");
let MarketGatewayModule = class MarketGatewayModule {
};
exports.MarketGatewayModule = MarketGatewayModule;
exports.MarketGatewayModule = MarketGatewayModule = __decorate([
    (0, common_1.Module)({
        imports: [(0, common_1.forwardRef)(() => market_data_module_1.MarketDataModule)],
        providers: [market_gateway_1.MarketGateway],
        exports: [market_gateway_1.MarketGateway],
    })
], MarketGatewayModule);
//# sourceMappingURL=market-gateway.module.js.map