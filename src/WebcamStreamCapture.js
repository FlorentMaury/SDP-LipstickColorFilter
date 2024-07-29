import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import '@tensorflow/tfjs-backend-webgl';

const WebcamStreamCapture = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [lipColor, setLipColor] = useState('#ff0000'); // Rouge par défaut
  const [detector, setDetector] = useState(null);

  // Fonction pour charger le modèle
  const loadModel = async () => {
    await tf.setBackend('webgl');
    const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
    const detectorConfig = {
      runtime: 'mediapipe',
      solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
    };
    const detector = await faceLandmarksDetection.createDetector(model, detectorConfig);
    setDetector(detector);
  };

  useEffect(() => {
    loadModel();
  }, []);

  useEffect(() => {
    const detect = async () => {
      if (
        detector &&
        webcamRef.current &&
        webcamRef.current.video.readyState === 4
      ) {
        const video = webcamRef.current.video;
        const videoWidth = webcamRef.current.video.videoWidth;
        const videoHeight = webcamRef.current.video.videoHeight;

        webcamRef.current.video.width = videoWidth;
        webcamRef.current.video.height = videoHeight;
        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;

        const faces = await detector.estimateFaces(video, false);
        console.log(faces);

        const ctx = canvasRef.current.getContext('2d');
        drawMesh(faces, ctx);
      }
    };

    // Appel récurrent de detect
    const intervalId = setInterval(() => {
      detect();
    }, 100); // Détecte toutes les 100ms

    return () => clearInterval(intervalId); // Nettoyage à la désinscription
  }, [detector]);

  // Fonction pour dessiner les landmarks des lèvres sur le Canvas
  const drawMesh = (faces, ctx) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    faces.forEach(face => {
      // Vérifiez d'abord si scaledMesh existe et contient un nombre suffisant de points
      if (!face.scaledMesh || face.scaledMesh.length < 154) {
        console.error('scaledMesh est undefined ou ne contient pas assez de landmarks.');
        return;
      }

      // Si tout est en ordre, continuez avec le dessin
      const lipsUpperInner = face.scaledMesh.slice(61, 68);
      const lipsLowerInner = face.scaledMesh.slice(146, 154);

      ctx.beginPath();
      lipsUpperInner.concat(lipsLowerInner).forEach(([x, y], i) => {
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.closePath();
      ctx.fillStyle = lipColor;
      ctx.fill();
    });
  };

  return (
    <>
      <Webcam ref={webcamRef} style={{ width: "100%" }} />
      <canvas ref={canvasRef} style={{ position: "absolute", left: 0, top: 0 }} />
      <input type="color" value={lipColor} onChange={(e) => setLipColor(e.target.value)} />
    </>
  );
};

export default WebcamStreamCapture;