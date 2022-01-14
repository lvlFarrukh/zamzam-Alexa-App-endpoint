import express from "express";
import morgan from "morgan";
import Alexa, { SkillBuilders } from "ask-sdk-core";
import { ExpressAdapter } from "ask-sdk-express-adapter";
import "dotenv/config";
import "./config/db.mjs"
import { setUserData } from './utiles/Initiate.mjs'
import axios from "axios";
import Order from "./modal/Order.mjs"

const app = express();
const PORT = process.env.PORT || 3001;

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
  async handle(handlerInput) {
    const speechText = "Welcome to Zamzam restaurant, I am your virtual assistance. you can ask for the menu";
    const reprompt = "I am your virtual assistant. you can ask for the menu"

    await setUserData()
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

const OrderIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "OrderIntent"
    );
  },
  async handle(handlerInput) {

    const slots = handlerInput
      .requestEnvelope
      .request
      .intent
      .slots;

    const dish = slots.dish.value;
    const quantity = slots.quantity.value || 1;

    const apiAccessToken = Alexa.getApiAccessToken(handlerInput.requestEnvelope)
    try {
      const responseArray = await Promise.all([
        axios.get("https://api.amazonalexa.com/v2/accounts/~current/settings/Profile.email",
          { headers: { Authorization: `Bearer ${apiAccessToken}` } },
        ),
        axios.get("https://api.amazonalexa.com/v2/accounts/~current/settings/Profile.name",
          { headers: { Authorization: `Bearer ${apiAccessToken}` } },
        ),
      ])
      const email = responseArray[0].data;
      const name = responseArray[1].data;
      let outputSpeek = ""
      if (email && dish && name) {
        const order = new order({
          userName: name,
          userEmail: email,
          dish: dish,
          quantity: quantity,
        })
        await order.save()
          .then(() => {
            outputSpeek = "Your order has been placed.";
          })
          .catch(error => {
            outputSpeek = "Something went wrong please try again";
          })

      }

      else {

      }

      return handlerInput.responseBuilder
        .speak("Dish: ", dish, "Quantity: ", quantity)
        // .reprompt(reprompt)
        // .withSimpleCard("Zamzam Restaurant Menu",cardText)
        .getResponse();
      }
    catch(error) {
      console.log(error.response.status)
      if (error.response.status === 403) {
        return responseBuilder
          .speak('I am Unable to read your email. Please goto Alexa app and then goto Malik Resturant Skill and Grant Profile Permissions to this skill')
          .withAskForPermissionsConsentCard(["alexa::profile:email:read"]) // https://developer.amazon.com/en-US/docs/alexa/custom-skills/request-customer-contact-information-for-use-in-your-skill.html#sample-response-with-permissions-card
          .getResponse();
      }
      return responseBuilder
        .speak('Uh Oh. Looks like something went wrong.')
        .getResponse();
    }
    // const speechText = 'In the menu, we have Beef kabab, Mutton kabab, Chicken Reshmi kabab, Gola kabab and Seekh kabab. which one would you like to order?';
    // const reprompt = 'we have Beef kabab, Mutton kabab, Chicken Reshmi kabab, Gola kabab and Seekh kabab.';
    // const cardText = '1. Beef kabab \n2. Mutton kabab \n3. Chicken Reshmi kabab \n4. Gola kabab \n5. Seekh kabab.';

   
  },
};

const skillBuilder = SkillBuilders.custom()
  .addRequestHandlers(LaunchRequestHandler, ShowMenuIntentHandler, OrderIntentHandler)
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
