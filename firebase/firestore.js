import {
  doc,
  collection,
  setDoc,
  updateDoc,
  orderBy,
  limit,
  deleteField,
  getDocs,
  query,
  runTransaction,
} from "firebase/firestore";
import { db } from "./init";

export const createGame = async ({ title, createdBy }) => {
  await setDoc(doc(db, "rides", title), {
    createdBy,
  });
};

export const createScore = async ({ title, name, score }) => {
  await setDoc(doc(db, "scores", title), {
    name,
    score,
  });
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

export const claimPlayer = async ({ title, player, uid }) => {
  const toUpdate = {};
  toUpdate[player] = uid;
  await updateDoc(doc(db, "rides", title), toUpdate);
};

export const bumpScore = async ({ title, player, score }) => {
  const toUpdate = {};
  toUpdate[player + "Score"] = score;
  await updateDoc(doc(db, "rides", title), toUpdate);
};

export const shiftLeft = async ({ title, player }) => {
  await runTransaction(db, async (transaction) => {
    const docRef = doc(db, "rides", title);
    const myDoc = await transaction.get(docRef);
    if (!myDoc.exists()) {
      throw "Document does not exist!";
    }
    const data = myDoc.data();
    const currentLeft = data[player + "Left"];
    const currentRight = data[player + "Right"];
    const leftLeft = currentLeft ? data[currentLeft + "Left"] : undefined;
    const toUpdate = {};
    if (leftLeft) {
      toUpdate[player + "Left"] = leftLeft;
    }
    if (currentLeft) {
      toUpdate[player + "Right"] = currentLeft;
      toUpdate[currentLeft + "Left"] = player;
      if (currentRight) {
        toUpdate[currentLeft + "Right"] = currentRight;
      } else {
        toUpdate[currentLeft + "Right"] = deleteField();
      }
    } else {
      toUpdate[player + "Right"] = deleteField();
    }
    if (currentRight) {
      if (currentLeft) {
        toUpdate[currentRight + "Left"] = currentLeft;
      } else {
        toUpdate[currentRight + "Left"] = deleteField();
      }
    }

    transaction.update(docRef, toUpdate);
  });
};

export const shiftRight = async ({ title, player }) => {
  await runTransaction(db, async (transaction) => {
    const docRef = doc(db, "rides", title);
    const myDoc = await transaction.get(docRef);
    if (!myDoc.exists()) {
      throw "Document does not exist!";
    }
    const data = myDoc.data();
    const currentRight = data[player + "Right"];
    const currentLeft = data[player + "Left"];
    const rightRight = currentRight ? data[currentRight + "Right"] : undefined;
    const toUpdate = {};
    if (rightRight) {
      toUpdate[player + "Right"] = rightRight;
    }
    if (currentRight) {
      toUpdate[player + "Left"] = currentRight;
      toUpdate[currentRight + "Right"] = player;
      if (currentLeft) {
        toUpdate[currentRight + "Left"] = currentLeft;
      } else {
        toUpdate[currentRight + "Left"] = deleteField();
      }
    } else {
      toUpdate[player + "Left"] = deleteField();
    }
    if (currentLeft) {
      if (currentRight) {
        toUpdate[currentLeft + "Right"] = currentRight;
      } else {
        toUpdate[currentLeft + "Right"] = deleteField();
      }
    }

    transaction.update(docRef, toUpdate);
  });
};
