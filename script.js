console.log("hello world");


let currentSong = new Audio();

let seekbarWidth = 0;
let isDragging = false;
let wasPlayingBeforeDrag = false;

let songs;
let currfolder;



function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "00:00";
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');
    return `${minutes}:${formattedSeconds}`;
}


function animateSeekbar() {
    // Only update the visuals if the user is NOT dragging the circle.
    if (!isDragging && !currentSong.paused && isFinite(currentSong.duration)) {
        // Update the time display
        document.querySelector(".songtime").innerHTML = `${formatTime(currentSong.currentTime)} / ${formatTime(currentSong.duration)}`;

       
        if (seekbarWidth > 0) {
            const progressPercent = (currentSong.currentTime / currentSong.duration) * 100;
            const newPosition = (currentSong.currentTime / currentSong.duration) * seekbarWidth;

            document.querySelector(".progress").style.width = `${progressPercent}%`;
            document.querySelector(".circle").style.transform = `translateX(${newPosition}px)`;
        }
    }

    // Request the next frame to continue the smooth animation.
    requestAnimationFrame(animateSeekbar);
}

async function getSongs(folder) {
    currfolder = folder;
    let a = await fetch(`http://127.0.0.1:5500/${currfolder}/`);
    let response = await a.text();
    let div = document.createElement("div");
    div.innerHTML = response;
    let Aas = div.getElementsByTagName("a");
    songs = [];
    for (let index = 0; index < Aas.length; index++) {
        const element = Aas[index];
       if (element.href.endsWith(".flac") || element.href.endsWith(".mp3") || element.href.endsWith(".m4a") || element.href.endsWith(".ogg")) {
            songs.push(element.href.split(`/${currfolder}/`)[1]);
        }
    }

    let songUl = document.querySelector(".songList").getElementsByTagName("ul")[0];
    songUl.innerHTML = "";

    for (const song of songs) {
        const rawFilename = song;
        const displayName = decodeURIComponent(rawFilename);
        songUl.innerHTML += `<li data-track="${rawFilename}">
                            <img src="assets/music.svg" alt="">
                            <div class="info">
                                <div>${displayName}</div>
                                <div></div>
                            </div>
                            <div class="playnow">
                                <span>play now</span>
                                <img src="assets/play.svg" alt="">
                            </div>
                        </li>`;
    }

    // Add click listeners to each song in the list to play them
    Array.from(document.querySelectorAll(".songList li")).forEach(e => {
        e.addEventListener("click", () => {
            const trackToPlay = e.dataset.track;
            const displayName = e.querySelector(".info div").innerHTML;
            playMusic(trackToPlay, displayName, true); // Explicitly play when clicked
        })
    });

    
    if (songs.length > 0) {
        playMusic(songs[0], decodeURIComponent(songs[0]), false);
    }
    
    return songs;
}

// **MODIFIED FUNCTION**: Added a 'playNow' parameter.
const playMusic = (track, displayName, playNow = true) => {
    currentSong.src = `/${currfolder}/` + track;
    document.querySelector(".songinfo").innerHTML = displayName;

    // When the song metadata is loaded, update the duration.
    currentSong.addEventListener("loadedmetadata", () => {
        document.querySelector(".songtime").innerHTML = `00:00 / ${formatTime(currentSong.duration)}`;
        const seekbar = document.querySelector(".seekbar");
        if (seekbar) {
            seekbarWidth = seekbar.getBoundingClientRect().width;
        }
    }, { once: true });

    
    if (playNow) {
        currentSong.play();
        document.getElementById("play").src = "assets/pause.svg";
    } else {
       
        document.getElementById("play").src = "assets/play.svg";
        document.querySelector(".songtime").innerHTML = "00:00 / 00:00"; // Show initial state
    }
}

async function displayAlbums() {
    let a = await fetch(`http://127.0.0.1:5500/songs/`);
    let response = await a.text();
    let div = document.createElement("div");
    div.innerHTML = response;
    let anchors = div.getElementsByTagName("a");
    let cardContainer = document.querySelector(".cardContainer");
    cardContainer.innerHTML = ""; 

    let array = Array.from(anchors)
    for (let index = 0; index < array.length; index++) {
        const e = array[index];

        if (e.href.includes("/songs/") && !e.href.endsWith("/songs/")) {
            let folder = e.href.split("/").slice(-1)[0];
            //get the metadata for the folder 
            let a = await fetch(`http://127.0.0.1:5500/songs/${folder}/info.json`);
            let response = await a.json();
            
            cardContainer.innerHTML += ` <div data-folder="${folder}" class="card ">
                            <div class="wrapper">
                                <img src="/songs/${folder}/cover.jpg"
                                    alt="">
                                <div class="play">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 123 123" width="40" height="40">
                                        <circle cx="61.44" cy="61.44" r="61.44" fill="#1ED760" />
                                        <path
                                            d="M84.32 65.41c3.31-2.13 3.3-4.51 0-6.4L50.13 39.36c-2.7-1.69-5.51-0.7-5.43 2.82l0.11 39.7c0.23 3.82 2.41 4.86 5.62 3.1l33.89-19.57z"
                                            fill="#000" />
                                    </svg>
                                </div>
                            </div>
                            <h2>${response.title}</h2>
                            <p>${response.description}</p>
                        </div>`
        }
    }

    //load the playlist whenever a card is clicked
    Array.from(document.getElementsByClassName("card")).forEach(e => {
        e.addEventListener("click", async item => {
            await getSongs(`songs/${item.currentTarget.dataset.folder}`);
        })
    })
}

async function main() {
    // Initially load the songs from the "anime" folder
    await getSongs("songs/anime");

    
    await displayAlbums();


    const play = document.getElementById("play");
    play.addEventListener("click", () => {
        if (!currentSong.src) return;
        if (currentSong.paused) {
            currentSong.play();
            play.src = "assets/pause.svg";
            requestAnimationFrame(animateSeekbar);
        } else {
            currentSong.pause();
            play.src = "assets/play.svg";
        }
    });

    const seekbar = document.querySelector(".seekbar");

    const seek = (e) => {
        if (currentSong.src && isFinite(currentSong.duration)) {
            const rect = seekbar.getBoundingClientRect();
            let offsetX = e.clientX - rect.left;

            if (offsetX < 0) offsetX = 0;
            if (offsetX > seekbarWidth) offsetX = seekbarWidth;

            const percent = offsetX / seekbarWidth;
            currentSong.currentTime = percent * currentSong.duration;

            document.querySelector(".progress").style.width = `${percent * 100}%`;
            document.querySelector(".circle").style.transform = `translateX(${offsetX}px)`;
        }
    };

    seekbar.addEventListener("mousedown", (e) => {
        isDragging = true;
        wasPlayingBeforeDrag = !currentSong.paused;
        if (wasPlayingBeforeDrag) {
            currentSong.pause();
        }
        seek(e);
    });

    window.addEventListener("mousemove", (e) => {
        if (isDragging) {
            seek(e);
        }
    });

    window.addEventListener("mouseup", () => {
        if (isDragging) {
            isDragging = false;
            if (wasPlayingBeforeDrag) {
                currentSong.play();
            }
        }
    });

    window.addEventListener("resize", () => {
        if (seekbar) {
            seekbarWidth = seekbar.getBoundingClientRect().width;
        }
    });

    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0";
    })

    document.querySelector(".cancel").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-100%";
    })

    next.addEventListener("click", () => {
        let index = songs.indexOf(currentSong.src.split("/").pop());
        if ((index + 1) < songs.length) {
            const nextSong = songs[index + 1];
            playMusic(nextSong, decodeURIComponent(nextSong));
        }
    })

    previous.addEventListener("click", () => {
        let index = songs.indexOf(currentSong.src.split("/").pop());
        if ((index - 1) >= 0) {
            const previousSong = songs[index - 1];
            playMusic(previousSong, decodeURIComponent(previousSong));
        }
    })

    
}

main();
