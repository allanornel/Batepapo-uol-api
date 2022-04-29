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
const promise = mongoClient.connect();
promise.then(() => console.log(""));
promise.catch((e) => console.log("Erro na conexão", e));
const db = mongoClient.db("projeto12");

app.post("/participants", async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().required().alphanum(),
  });
  const validacao = schema.validate(req.body);
  if (validacao.error) {
    res
      .status(422)
      .send(validacao.error.details.map((detail) => detail.message));
    return;
  }
  let { name } = req.body;
  let objParticipante = { name, lastStatus: Date.now() };
  let objMessage = {
    from: name,
    to: "Todos",
    text: "entra na sala...",
    type: "status",
    time: dayjs().format("HH:mm:ss"),
  };
  try {
    const find = await db.collection("participants").findOne({ name });
    if (!find) {
      await db.collection("participants").insertOne(objParticipante);
      await db.collection("messages").insertOne(objMessage);
      res.sendStatus(201);
    } else {
      res.sendStatus(409);
    }
  } catch (e) {
    res.status(500).send("Erro na tentativa de cadastrar o participante", e);
  }
});

app.get("/participants", async (req, res) => {
  try {
    const participants = await db.collection("participants").find({}).toArray();
    res.status(200).send(participants);
  } catch (e) {
    console.log("Erro na tentativa de conectar ao banco de dados", e);
  }
});

app.post("/messages", async (req, res) => {
  const schema = Joi.object({
    to: Joi.string().required().alphanum(),
    text: Joi.string().required(),
    type: Joi.string().valid("message", "private_message").required(),
  });
  const validacao = schema.validate(req.body);
  if (validacao.error) {
    res
      .status(422)
      .send(validacao.error.details.map((detail) => detail.message));
    return;
  }
  const from = req.headers.user;
  const { to, text, type } = req.body;
  const obj = { from, to, text, type, time: dayjs().format("HH:mm:ss") };
  console.log(obj);
  try {
    const find = await db
      .collection("participants")
      .find({ name: from })
      .toArray();
    console.log(find);
    if (find && find.length > 0) {
      await db.collection("messages").insertOne(obj);
      res.sendStatus(201);
    } else {
      res.status(422).send("O participante não consta na lista de usuários");
    }
  } catch (e) {
    console.log("Erro na tentativa de conectar ao banco de dados", e);
  }
});

app.get("/messages", async (req, res) => {
  const { user } = req.headers;
  const limit = parseInt(req.query.limit);
  try {
    const messages = await db
      .collection("messages")
      .find({ $or: [{ to: user }, { from: user }, { to: "Todos" }] })
      .toArray();
    if (limit) {
      res.status(200).send(messages.slice(-limit));
    } else {
      res.status(200).send(messages);
    }
  } catch (e) {
    console.log("Erro na tentativa de conectar ao banco de dados", e);
  }
});

app.post("/status", async (req, res) => {
  const { user } = req.headers;
  try {
    const find = await db
      .collection("participants")
      .find({ name: user })
      .toArray();
    if (find) {
      await db
        .collection("participants")
        .updateOne({ name: user }, { $set: { lastStatus: Date.now() } });
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  } catch (e) {
    console.log("Erro na tentativa de conectar ao banco de dados", e);
  }
});

// setInterval(() => {
//   // messagem da retirada da sala
//   let objMessage = {
//     from: name,
//     to: "Todos",
//     text: "sai na sala...",
//     type: "status",
//     time: dayjs().format("HH:mm:ss"),
//   };
// }, 15 * 1000);

app.listen(5000);
