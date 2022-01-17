import express from "express";
import morgan from "morgan";
import Alexa, { SkillBuilders } from "ask-sdk-core";
import { ExpressAdapter } from "ask-sdk-express-adapter";
import "dotenv/config";
import "./config/db.mjs";
import { setUserData } from "./utiles/Initiate.mjs";
import axios from "axios";
import Order from "./modal/Order.mjs";
import Cart from "./modal/Cart.mjs";
import e from "express";

const app = express();
const PORT = process.env.PORT || 3002;

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
    const speechText =
      "Welcome to Zamzam restaurant, I am your virtual assistance. you can ask for the menu";
    const reprompt = "I am your virtual assistant. you can ask for the menu";

    await setUserData();
    return (
      handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(reprompt)

        //   .withSimpleCard(
        //     "Welcome to your SDK weather skill. Ask me the weather!",
        //     speechText
        //   )
        .getResponse()
    );
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
    const speechText =
      "In the menu, we have Beef kabab, Mutton kabab, Chicken Reshmi kabab, Gola kabab and Seekh kabab. which one would you like to order?";
    const reprompt =
      "we have Beef kabab, Mutton kabab, Chicken Reshmi kabab, Gola kabab and Seekh kabab.";
    const cardText =
      "1. Beef kabab \n2. Mutton kabab \n3. Chicken Reshmi kabab \n4. Gola kabab \n5. Seekh kabab.";

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(reprompt)
      .withSimpleCard("Zamzam Restaurant Menu", cardText)
      .getResponse();
  },
};

const AddToCartIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "AddToCartIntent"
    );
  },
  async handle(handlerInput) {
    const slots = handlerInput.requestEnvelope.request.intent.slots;

    const dishName = slots.dish.value;
    const quantity = slots.quantity.value || 1;

    if (!dishName) {
      const cardText =
        "1. Beef kabab \n2. Mutton kabab \n3. Chicken Reshmi kabab \n4. Gola kabab \n5. Seekh kabab.";

      return handlerInput.responseBuilder
        .speak(`please tell me dish name. or you can ask for the menu.`)
        .reprompt(`please tell me dish name. or you can ask for the menu.`)
        .withSimpleCard("Our Menu", cardText)
        .getResponse();
    }

    const apiAccessToken = Alexa.getApiAccessToken(
      handlerInput.requestEnvelope
    );
    try {
      const responseArray = await Promise.all([
        axios.get(
          "https://api.amazonalexa.com/v2/accounts/~current/settings/Profile.email",
          { headers: { Authorization: `Bearer ${apiAccessToken}` } }
        ),
        axios.get(
          "https://api.amazonalexa.com/v2/accounts/~current/settings/Profile.name",
          { headers: { Authorization: `Bearer ${apiAccessToken}` } }
        ),
      ]);
      const customerEmail = responseArray[0].data;
      const customerName = responseArray[1].data;
      console.log(
        `--- ${customerEmail} ${customerName} ${dishName} ${quantity}`
      );

      if (!customerEmail) {
        return handlerInput.responseBuilder
          .speak(
            `looks like you dont have an email associated with this device, please set your email in Alexa App Settings`
          )
          .getResponse();
      }

      try {
        let cart = await Cart.findOneAndUpdate(
          { customerEmail: customerEmail },
          {
            customerEmail: customerEmail,
            customerName: customerName,
            $push: {
              items: [
                {
                  dishName: dishName,
                  quantity: quantity,
                },
              ],
            },
          },
          { upsert: true }
        ).exec();

        console.log("added to cart: ", cart);
        return handlerInput.responseBuilder
          .speak(
            `Dear ${customerName}, ${quantity} ${dishName} is added in your cart, 
                  feel free to add more dishes
                  or say checkout to complete your order`
          )
          .getResponse();
      } catch (err) {
        console.log("error in db: ", err);
        return handlerInput.responseBuilder
          .speak(`something went wrong in db operation`)
          .getResponse();
      }

      return handlerInput.responseBuilder
        .speak(
          `Dear ${customerName}, ${quantity} ${dishName} is added in your cart, 
                  feel free to add more dishes
                  or say checkout to complete your order`
        )
        .getResponse();
    } catch (error) {
      console.log(error.response.status);
      if (error.response.status === 403) {
        return handlerInput.responseBuilder
          .speak(
            "I am Unable to read your email. Please goto Alexa app and then goto Malik Resturant Skill and Grant Profile Permissions to this skill"
          )
          .withAskForPermissionsConsentCard(["alexa::profile:email:read"]) // https://developer.amazon.com/en-US/docs/alexa/custom-skills/request-customer-contact-information-for-use-in-your-skill.html#sample-response-with-permissions-card
          .getResponse();
      }
      return handlerInput.responseBuilder
        .speak("Uh Oh. Looks like something went wrong.")
        .getResponse();
    }
  },
};

const ShowCartIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "ShowCartIntent"
    );
  },
  async handle(handlerInput) {

    try {
      const apiAccessToken = Alexa.getApiAccessToken(
        handlerInput.requestEnvelope
      );
      const responseArray = await Promise.all([
        axios.get(
          "https://api.amazonalexa.com/v2/accounts/~current/settings/Profile.email",
          { headers: { Authorization: `Bearer ${apiAccessToken}` } }
        ),
        axios.get(
          "https://api.amazonalexa.com/v2/accounts/~current/settings/Profile.name",
          { headers: { Authorization: `Bearer ${apiAccessToken}` } }
        ),
      ]);
      const customerEmail = responseArray[0].data;
      const customerName = responseArray[1].data;
     
      if (!customerEmail) {
        return handlerInput.responseBuilder
          .speak(
            `looks like you dont have an email associated with this device, please set your email in Alexa App Settings`
          )
          .getResponse();
      }

      try {
        let cart = await Cart.find({
          customerEmail
        }).exec();

        if (!cart) {
          return handlerInput.responseBuilder
            .speak(
              `Sorry you have no items in your cart.`
            )
            .getResponse();
        }

        const TOTAL_ITEMS = cart[0]?.items?.length;
        const customerName = cart[0]?.customerName;
        let speekOutput = `Dear ${customerName}, you have ${TOTAL_ITEMS} items in your card, `;
        let cardText = speekOutput;
        cart[0]?.items?.map( (item, index) => {
          if (index === 0) speekOutput = speekOutput + `that is `;
          speekOutput = speekOutput + `${item?.quantity} plate ${item?.dishName}. `;
          cardText = cardText + `\n${index+1}. ${item?.dishName}--${item?.quantity} plate.`;
        })

        console.log("Cart Items: ", cart);
        return handlerInput.responseBuilder
          .speak(speekOutput)
          .withSimpleCard("customerName", cardText)
          .reprompt(`feel free to add more dishes or say checkout to complete your order`)
          .getResponse();
      } catch (err) {
        console.log("error in db: ", err);
        return handlerInput.responseBuilder
          .speak(`something went wrong in db operation`)
          .getResponse();
      }


    } catch (error) {
      console.log(error.response.status);
      if (error.response.status === 403) {
        return handlerInput.responseBuilder
          .speak(
            "I am Unable to read your email. Please goto Alexa app and then goto Malik Resturant Skill and Grant Profile Permissions to this skill"
          )
          .withAskForPermissionsConsentCard(["alexa::profile:email:read"]) // https://developer.amazon.com/en-US/docs/alexa/custom-skills/request-customer-contact-information-for-use-in-your-skill.html#sample-response-with-permissions-card
          .getResponse();
      }
      return handlerInput.responseBuilder
        .speak("Uh Oh. Looks like something went wrong.")
        .getResponse();
    }
  },
};

const ClearCartIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "ClearCartIntent"
    );
  },
  async handle(handlerInput) {

    try {
      console.log("working")
      const apiAccessToken = Alexa.getApiAccessToken(
        handlerInput.requestEnvelope
      );
      const responseArray = await Promise.all([
        axios.get(
          "https://api.amazonalexa.com/v2/accounts/~current/settings/Profile.email",
          { headers: { Authorization: `Bearer ${apiAccessToken}` } }
        ),
        axios.get(
          "https://api.amazonalexa.com/v2/accounts/~current/settings/Profile.name",
          { headers: { Authorization: `Bearer ${apiAccessToken}` } }
        ),
      ]);
      const customerEmail = responseArray[0].data;
      const customerName = responseArray[1].data;
     
      if (!customerEmail) {
        return handlerInput.responseBuilder
          .speak(
            `looks like you dont have an email associated with this device, please set your email in Alexa App Settings`
          )
          .getResponse();
      }

      try {
        
        let cart = await Cart.findOneAndUpdate(
          { customerEmail: customerEmail },
          {
            customerEmail: customerEmail,
            customerName: customerName,
            items: [],
          },
          { upsert: true }
        ).exec();

        

        console.log("Cart Items: ", cart);
        return handlerInput.responseBuilder
          .speak("Your card has been clear")
          .reprompt(`feel free to add more dishes or say checkout to complete your order`)
          .getResponse();
      } catch (err) {
        console.log("error in db: ", err);
        return handlerInput.responseBuilder
          .speak(`something went wrong in db operation`)
          .getResponse();
      }


    } catch (error) {
      console.log(error.response.status);
      if (error.response.status === 403) {
        return handlerInput.responseBuilder
          .speak(
            "I am Unable to read your email. Please goto Alexa app and then goto Malik Resturant Skill and Grant Profile Permissions to this skill"
          )
          .withAskForPermissionsConsentCard(["alexa::profile:email:read"]) // https://developer.amazon.com/en-US/docs/alexa/custom-skills/request-customer-contact-information-for-use-in-your-skill.html#sample-response-with-permissions-card
          .getResponse();
      }
      return handlerInput.responseBuilder
        .speak("Uh Oh. Looks like something went wrong.")
        .getResponse();
    }
  },
};

const CheckoutIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "CheckoutIntent"
    );
  },
  async handle(handlerInput) {

    try {
      console.log("working")
      const apiAccessToken = Alexa.getApiAccessToken(
        handlerInput.requestEnvelope
      );
      const responseArray = await Promise.all([
        axios.get(
          "https://api.amazonalexa.com/v2/accounts/~current/settings/Profile.email",
          { headers: { Authorization: `Bearer ${apiAccessToken}` } }
        ),
        axios.get(
          "https://api.amazonalexa.com/v2/accounts/~current/settings/Profile.name",
          { headers: { Authorization: `Bearer ${apiAccessToken}` } }
        ),
      ]);
      const customerEmail = responseArray[0].data;
      const customerName = responseArray[1].data;
     
      if (!customerEmail) {
        return handlerInput.responseBuilder
          .speak(
            `looks like you dont have an email associated with this device, please set your email in Alexa App Settings`
          )
          .getResponse();
      }

      try {
        
        let cart = await Cart.findOneAndUpdate(
          { customerEmail: customerEmail },
          {
            customerEmail: customerEmail,
            customerName: customerName,
            items: [],
          },
          { upsert: true }
        ).exec();

        

        console.log("Cart Items: ", cart);
        return handlerInput.responseBuilder
          .speak("Your card has been clear")
          .reprompt(`feel free to add more dishes or say checkout to complete your order`)
          .getResponse();
      } catch (err) {
        console.log("error in db: ", err);
        return handlerInput.responseBuilder
          .speak(`something went wrong in db operation`)
          .getResponse();
      }


    } catch (error) {
      console.log(error.response.status);
      if (error.response.status === 403) {
        return handlerInput.responseBuilder
          .speak(
            "I am Unable to read your email. Please goto Alexa app and then goto Malik Resturant Skill and Grant Profile Permissions to this skill"
          )
          .withAskForPermissionsConsentCard(["alexa::profile:email:read"]) // https://developer.amazon.com/en-US/docs/alexa/custom-skills/request-customer-contact-information-for-use-in-your-skill.html#sample-response-with-permissions-card
          .getResponse();
      }
      return handlerInput.responseBuilder
        .speak("Uh Oh. Looks like something went wrong.")
        .getResponse();
    }
  },
};

const skillBuilder = SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    ShowMenuIntentHandler,
    AddToCartIntentHandler,
    ShowCartIntentHandler,
    ClearCartIntentHandler
  )
  .addErrorHandlers(ErrorHandler);
const skill = skillBuilder.create();
const adapter = new ExpressAdapter(skill, false, false);

app.use(morgan("dev"));

app.post("/api/v1/webhook-alexa", adapter.getRequestHandlers());

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server running");
});

app.listen(PORT);
