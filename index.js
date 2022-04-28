import express, { json } from "express";
import cors from "cors";
import Joi from "joi";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import dayjs from "dayjs";
dotenv.config();

const app = express();
app.use(json());
app.use(cors());

const mongoClient = new MongoClient(process.env.MONGO_URI);

app.post("/participants", async (req, res) => {
  // const schema = Joi.object({
  //   username: Joi.string().required().alphanum(),
  // });
  let { name } = req.body;
  //falta joi e verificadores

  let objParticipante = { name, lastStatus: Date.now() };
  let objMessage = {
    from: name,
    to: "Todos",
    text: "entra na sala...",
    type: "status",
    time: dayjs().format("HH:MM:SS"),
  };
  try {
    await mongoClient.connect();
    const db = mongoClient.db("projeto12");
    await db.collection("participants").insertOne(objParticipante);
    await db.collection("messages").insertOne(objMessage);
    res.sendStatus(201);
    mongoClient.close();
  } catch (e) {
    console.log("Erro na tentativa de conectar ao banco de dados", e);
    mongoClient.close();
  }
});

app.get("/participants", async (req, res) => {
  try {
    await mongoClient.connect();
    const db = mongoClient.db("projeto12");
    const participants = await db.collection("participants").find({}).toArray();
    res.sendStatus(200).send(participants);
    mongoClient.close();
  } catch (e) {
    console.log("Erro na tentativa de conectar ao banco de dados", e);
    mongoClient.close();
  }
});

app.post("/messages", async (req, res) => {});

app.get("/messages", async (req, res) => {});

app.post("/status", async (req, res) => {});

app.listen(5000);
