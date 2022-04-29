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
    time: dayjs().format("HH:mm:ss"),
  };
  try {
    await mongoClient.connect();
    const db = mongoClient.db("projeto12");
    const find = await db.collection("participants").findOne({ name });
    console.log(find);
    if (!find) {
      await db.collection("participants").insertOne(objParticipante);
      await db.collection("messages").insertOne(objMessage);
      res.sendStatus(201);
    } else {
      res.sendStatus(409);
    }

    mongoClient.close();
  } catch (e) {
    res.status(500).send("Erro na tentativa de cadastrar o participante", e);
    mongoClient.close();
  }
});

app.get("/participants", async (req, res) => {
  try {
    await mongoClient.connect();
    const db = mongoClient.db("projeto12");
    const participants = await db.collection("participants").find({}).toArray();
    res.status(200).send(participants);
    mongoClient.close();
  } catch (e) {
    console.log("Erro na tentativa de conectar ao banco de dados", e);
    mongoClient.close();
  }
});

app.post("/messages", async (req, res) => {
  const from = req.headers.user;
  const { to, text, type } = req.body;
  // **to** e **text** devem ser strings não vazias
  // **type** só pode ser 'message' ou 'private_message'
  // **from** deve ser um participante existente na lista de participantes

  const obj = { from, to, text, type, time: dayjs().format("HH:mm:ss") };
  console.log(obj);
  try {
    await mongoClient.connect();
    const db = mongoClient.db("projeto12");
    await db.collection("messages").insertOne(obj);
    res.status(201);
    mongoClient.close();
  } catch (e) {
    console.log("Erro na tentativa de conectar ao banco de dados", e);
    mongoClient.close();
  }
  res.sendStatus(201);
});

app.get("/messages", async (req, res) => {
  const { user } = req.headers;
  const limit = parseInt(req.query.limit);
  try {
    await mongoClient.connect();
    const db = mongoClient.db("projeto12");
    const messages = await db
      .collection("messages")
      .find({ $or: [{ to: user }, { from: user }, { to: "Todos" }] })
      .toArray();
    if (limit) {
      res.status(200).send(messages.slice(-limit));
    } else {
      res.status(200).send(messages);
    }
    mongoClient.close();
  } catch (e) {
    console.log("Erro na tentativa de conectar ao banco de dados", e);
    mongoClient.close();
  }
});

app.post("/status", async (req, res) => {
  const { user } = req.headers;
  try {
    await mongoClient.connect();
    const db = mongoClient.db("projeto12");
    const find = await db
      .collection("participants")
      .find({ name: user })
      .toArray();
    if (find) {
      // await db.collection("participants").findOneAndUpdate({ lastStatus: Date.now() });
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
    mongoClient.close();
  } catch (e) {
    console.log("Erro na tentativa de conectar ao banco de dados", e);
    mongoClient.close();
  }
});

app.listen(5000);
