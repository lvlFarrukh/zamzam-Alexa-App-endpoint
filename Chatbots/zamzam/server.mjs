import express from "express";
import morgan from "morgan";
import Alexa, { SkillBuilders } from "ask-sdk-core";
import { ExpressAdapter } from "ask-sdk-express-adapter";

const app = express();
const PORT = process.env.PORT || 3000;

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    const speakOutput =
      "Sorry, I had trouble doing what you asked. Please try again.";
    console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "LaunchRequest"
    );
  },
  handle(handlerInput) {
    const speechText = "Welcome to Zamzam restaurant, I am your virtual assistance. you can ask for the menu";
    const reprompt = "I am your virtual assistant. you can ask for the menu"

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(reprompt)

    //   .withSimpleCard(
    //     "Welcome to your SDK weather skill. Ask me the weather!",
    //     speechText
    //   )
      .getResponse();
  },
};

const ShowMenuIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "ShowMenuIntent"
    );
  },
  handle(handlerInput) {
    const speechText = 'In the menu, we have Beef kabab, Mutton kabab, Chicken Reshmi kabab, Gola kabab and Seekh kabab. which one would you like to order?';
    const reprompt = 'we have Beef kabab, Mutton kabab, Chicken Reshmi kabab, Gola kabab and Seekh kabab.';
    const cardText = '1. Beef kabab \n2. Mutton kabab \n3. Chicken Reshmi kabab \n4. Gola kabab \n5. Seekh kabab.';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(reprompt)
      .withSimpleCard("Zamzam Restaurant Menu",cardText)
      .getResponse();
  },
};

const skillBuilder = SkillBuilders.custom()
  .addRequestHandlers(LaunchRequestHandler, ShowMenuIntentHandler)
  .addErrorHandlers(ErrorHandler);
const skill = skillBuilder.create();
const adapter = new ExpressAdapter(skill, false, false);

app.use(morgan("dev"));

app.post('/api/v1/webhook-alexa', adapter.getRequestHandlers());

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server running");
});

app.listen(PORT);
