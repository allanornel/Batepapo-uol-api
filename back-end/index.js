import express, { json } from "express";
import cors from "cors";
import Joi from "joi";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import dayjs from "dayjs";
dotenv.config();

const app = express();
app.use(json());
app.use(cors());

const mongoClient = new MongoClient(process.env.MONGO_URI);
const promise = mongoClient.connect();
promise.catch((e) => console.log("Erro na conexão ao banco de dados", e));
const db = mongoClient.db(process.env.DATABASE);

app.post("/participants", async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().required().alphanum().trim(),
  });
  const validacao = schema.validate(req.body);
  if (validacao.error) {
    res
      .status(422)
      .send(validacao.error.details.map((detail) => detail.message));
    return;
  }
  let { name } = validacao.value;
  let objParticipante = { name, lastStatus: Date.now() };
  let objMessage = {
    from: name,
    to: "Todos",
    text: "entra na sala...",
    type: "status",
    time: dayjs().format("HH:mm:ss"),
  };
  console.log(objMessage);
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
    console.log("Erro na tentativa de obter os participantes", e);
    res.status(500).send(e);
  }
});

app.post("/messages", async (req, res) => {
  const schema = Joi.object({
    to: Joi.string().required().alphanum().trim(),
    text: Joi.string().required().trim(),
    type: Joi.string().valid("message", "private_message").required().trim(),
  });
  const validacao = schema.validate(req.body);
  if (validacao.error) {
    res
      .status(422)
      .send(validacao.error.details.map((detail) => detail.message));
    return;
  }
  const from = req.headers.user;
  const { to, text, type } = validacao.value;
  const obj = { from, to, text, type, time: dayjs().format("HH:mm:ss") };
  try {
    const find = await db
      .collection("participants")
      .find({ name: from })
      .toArray();
    if (find && find.length > 0) {
      await db.collection("messages").insertOne(obj);
      res.sendStatus(201);
    } else {
      res.status(422).send("O participante não consta na lista de usuários");
    }
  } catch (e) {
    console.log("Erro na tentativa de postar mensagens", e);
    res.status(500).send(e);
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
    console.log("Erro na tentativa de obter as mensagens", e);
    res.status(500).send(e);
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
    console.log("Erro na tentativa de atualizar o status", e);
    res.status(500).send(e);
  }
});

setInterval(async () => {
  try {
    const find = await db
      .collection("participants")
      .find({ lastStatus: { $lte: Date.now() - 10000 } })
      .toArray();
    if (find && find.length > 0) {
      find.map(async (participant) => {
        let objMessage = {
          from: participant.name,
          to: "Todos",
          text: "sai da sala...",
          type: "status",
          time: dayjs().format("HH:mm:ss"),
        };
        await db.collection("participants").deleteOne({ _id: participant._id });
        await db.collection("messages").insertOne(objMessage);
      });
    }
  } catch (e) {
    console.log("Erro no loop de remoção automática de usuários inativos", e);
    res.status(500).send(e);
  }
}, 15 * 1000);

//BONUS
app.delete("/messages/:id", async (req, res) => {
  const { id } = req.params;
  const { user } = req.headers;
  try {
    const find = await db
      .collection("messages")
      .find({ _id: new ObjectId(id) })
      .toArray();

    if (!find || find.length === 0) {
      res.sendStatus(404);
      return;
    }
    if (find[0].from !== user) {
      res.sendStatus(401);
      return;
    }
    await db.collection("messages").deleteOne({ _id: ObjectId(id) });
    res.sendStatus(200);
  } catch (e) {
    console.log(e);
    res.status(500).send(e);
  }
});

app.listen(5000);
