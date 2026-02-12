"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const subscription_module_1 = require("./subscription/subscription.module");
const market_gateway_module_1 = require("./market-gateway/market-gateway.module");
const market_data_module_1 = require("./market-data/market-data.module");
const news_module_1 = require("./news/news.module");
const ai_analysis_module_1 = require("./ai-analysis/ai-analysis.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            schedule_1.ScheduleModule.forRoot(),
            subscription_module_1.SubscriptionModule,
            market_gateway_module_1.MarketGatewayModule,
            market_data_module_1.MarketDataModule,
            news_module_1.NewsModule,
            ai_analysis_module_1.AiAnalysisModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map