import {
  doc,
  collection,
  setDoc,
  updateDoc,
  orderBy,
  limit,
  getDoc,
  getDocs,
  query,
  onSnapshot,
  runTransaction,
} from "firebase/firestore";
import { makeid } from "../util/ids";
import { auth, db } from "./init";
const negMod = (x, n) => ((x % n) + n) % n;

export const listen = ({ title, listener }) =>
  onSnapshot(doc(db, "rides", title), listener);

export const createGame = async () => {
  const title = makeid(6);
  const myDoc = doc(db, "rides", title);
  const payload = {
    createdBy: auth.currentUser.uid,
  };
  console.log(title, payload, auth.currentUser);
  console.log("creating game at", title);
  await setDoc(myDoc, payload);
  return { title };
};

export const getGame = async ({ title }) => {
  const myDoc = doc(db, "rides", title);
  const docSnap = await getDoc(myDoc);

  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    // doc.data() will be undefined in this case
    return undefined;
  }
};
export const createScore = async ({ title, name, score }) => {
  await setDoc(doc(db, "scores", title), {
    name,
    score,
  });
};

export const setStart = async ({ title, startsAt }) => {
  await setDoc(doc(db, "rides", title), {
    startsAt,
  });
};

export const claimPlayerLoop = async ({ title, name }) => {
  const docRef = doc(db, "rides", title);
  const claimPlayer = () =>
    runTransaction(db, async (transaction) => {
      console.log("starting transaction", title, transaction);
      const myDoc = await transaction.get(docRef);
      console.log("got my doc");
      if (!myDoc.exists()) {
        throw "Document does not exist!";
      }
      const data = myDoc.data();
      console.log("got doc transaction", data);
      if (data.startsAt) {
        return false;
      }
      let i;
      for (var j = 1; j < 9; j++) {
        if (!data["player" + j]) {
          i = j;
          break;
        }
      }
      if (i !== undefined) {
        const toUpdate = {};
        toUpdate["player" + i] = auth.currentUser.uid;
        toUpdate["player" + i + "Name"] = name;
        toUpdate["player" + i + "Position"] = i;
        console.log("updating", toUpdate);
        transaction.update(docRef, toUpdate);
      }
      console.log("done with", i);
      return i;
    });
  let i = 0;
  let o;
  // 8 is the max tries we can possibly do for an 8-player game, cap at that
  while (i < 8) {
    o = await claimPlayer();
    if (o !== undefined) {
      break;
    }
    i++;
  }
  console.log("returning", o);
  return o;
};

export const getHighScores = async () => {
  const highScores = [];
  const q = query(
    collection(db, "scores"),
    orderBy("score", "desc"),
    limit(10)
  );
  const querySnapshot = await getDocs(q);
  querySnapshot.forEach((doc) => {
    highScores.push(doc.data());
  });
  return highScores;
};

export const bumpScore = async ({ title, player, score }) => {
  const toUpdate = {};
  toUpdate[player + "Score"] = score;
  await updateDoc(doc(db, "rides", title), toUpdate);
};

export const shiftPlayer =
  (n) =>
  async ({ title, player }) => {
    await runTransaction(db, async (transaction) => {
      const docRef = doc(db, "rides", title);
      const myDoc = await transaction.get(docRef);
      const newPos = negMod(currentPosition + n, 8);
      if (!myDoc.exists()) {
        throw "Document does not exist!";
      }
      const data = myDoc.data();
      const currentPosition = data[player + "Position"];
      const toUpdate = {};
      for (var i = 1; i < 9; i++) {
        if (data["player" + i + "Position"] === newPos) {
          toUpdate["player" + i + "Position"] = currentPosition;
          break;
        }
      }
      toUpdate[player + "Position"] = newPos;
      transaction.update(myDoc, toUpdate);
    });
  };

export const shiftLeft = shiftPlayer(1);

export const shiftRight = shiftPlayer(-1);