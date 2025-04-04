//async function loadMusic() {
//  const backendURL = "http://ec2-3-92-216-119.compute-1.amazonaws.com/api/music";
//  try {
//    const response = await fetch(backendURL);
//    const data = await response.json();
//    console.log(data);
//
//    const container = document.getElementById("musicList");
//    data.forEach(song => {
//      const p = document.createElement("p");
//      p.textContent = `${song.title} by ${song.artist}`;
//      container.appendChild(p);
//    });
//  } catch (err) {
//    console.error("Failed to load music:", err);
//  }
//}
//
//document.addEventListener("DOMContentLoaded", loadMusic);
