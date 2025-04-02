"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PersonaAuthorizer_1 = require("./PersonaAuthorizer");
/* eslint-disable @typescript-eslint/no-explicit-any */
module.exports.validateToken = async (event, context) => {
    const route = new PersonaAuthorizer_1.PersonaAuthorizer({ authorizationsHeader: event.headers["authorization"], path: event.routeArn }, context);
    return await route.handle();
};
/* eslint-enable @typescript-eslint/no-explicit-any */
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cEF1dGhvcml6ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJodHRwQXV0aG9yaXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDJEQUF3RDtBQUV4RCx1REFBdUQ7QUFDdkQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEdBQUcsS0FBSyxFQUFFLEtBQVUsRUFBRSxPQUFZLEVBQUUsRUFBRTtJQUNoRSxNQUFNLEtBQUssR0FBRyxJQUFJLHFDQUFpQixDQUFDLEVBQUMsb0JBQW9CLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzNILE9BQU8sTUFBTSxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7QUFDOUIsQ0FBQyxDQUFDO0FBQ0Ysc0RBQXNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUGVyc29uYUF1dGhvcml6ZXIgfSBmcm9tIFwiLi9QZXJzb25hQXV0aG9yaXplclwiO1xuXG4vKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5tb2R1bGUuZXhwb3J0cy52YWxpZGF0ZVRva2VuID0gYXN5bmMgKGV2ZW50OiBhbnksIGNvbnRleHQ6IGFueSkgPT4ge1xuICBjb25zdCByb3V0ZSA9IG5ldyBQZXJzb25hQXV0aG9yaXplcih7YXV0aG9yaXphdGlvbnNIZWFkZXI6IGV2ZW50LmhlYWRlcnNbXCJhdXRob3JpemF0aW9uXCJdLCBwYXRoOiBldmVudC5yb3V0ZUFybn0sIGNvbnRleHQpO1xuICByZXR1cm4gYXdhaXQgcm91dGUuaGFuZGxlKCk7XG59O1xuLyogZXNsaW50LWVuYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG4iXX0=