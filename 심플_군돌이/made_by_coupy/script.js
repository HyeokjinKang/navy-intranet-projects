const DAY = 1000 * 60 * 60 * 24;
const nameInput = document.getElementById("nameInput");
const dateSelector = document.getElementById("dateSelector");
const name = document.getElementById("name");
const level = document.getElementById("level");
const percentage = document.getElementById("percentage");
const pastPercentage = document.getElementById("pastPercentage");
const remainPercentage = document.getElementById("remainPercentage");
const detailContainers = document.getElementsByClassName("flexRowBetween");
const details = document.getElementsByClassName("details");
const texts = document.getElementsByClassName("texts");

let 입대일자 = new Date();
let 전역일자 = new Date();
let 계급 = ["민간인", "이병", "일병", "상병", "병장", "민간인"];
let prevDate = new Date().getDate();
let n = 0;

const validCheck = () => {
  if (isNaN(new Date(dateSelector.value).getTime())) {
    alert("올바르지 않은 날짜입니다.");
  } else if (new Date().getTime() < new Date(dateSelector.value).getTime()) {
    alert("아직 입대하지 않았습니다.");
  }
};

const updateSchedule = (a, b) => {
  let dateString = a ? a : dateSelector.value;
  if (isNaN(new Date(dateString).getTime()) || new Date().getTime() < new Date(dateString).getTime()) {
    dateSelector.style.color = "#f55442";
    return;
  }
  dateSelector.style.color = "black";
  
  localStorage['doriDateString'] = dateString;
  localStorage['doriName'] = nameInput.value;
  
  입대일자 = new Date(dateString);
  let 일병진급 = new Date(dateString);
  let 상병진급 = new Date(dateString);
  let 병장진급 = new Date(dateString);
  전역일자 = new Date(dateString);

  입대일자.setHours(0);
  let month = 입대일자.getMonth();
  month += 3;
  일병진급.setMonth(month);
  일병진급.setDate(1);
  일병진급.setHours(0);
  month += 6;
  상병진급.setMonth(month);
  상병진급.setDate(1);
  상병진급.setHours(0);
  month += 6;
  병장진급.setMonth(month);
  병장진급.setDate(1);
  병장진급.setHours(0);
  month += 5;
  let date = 입대일자.getDate() - 1;
  전역일자.setDate(date);
  전역일자.setMonth(month);
  전역일자.setHours(0);

  호봉 = 0;

  let 진급일자 = new Date();
  [...detailContainers].forEach(e => {
    e.style.display = "flex";
  });

  if (Date.now() >= 전역일자.getTime()) {
    n = 5;
    [...detailContainers].forEach(e => {
      e.style.display = "none";
    });
  } else if (Date.now() >= 병장진급.getTime()) {
    n = 4;
    호봉 = new Date().getMonth() - 병장진급.getMonth() + 1;
    detailContainers[4].style.display = "none";
  } else if (Date.now() >= 상병진급.getTime()) {
    n = 3;
    호봉 = new Date().getMonth() - 상병진급.getMonth() + 1;
    진급일자 = 병장진급;
  } else if (Date.now() >= 일병진급.getTime()) {
    n = 2;
    호봉 = new Date().getMonth() - 일병진급.getMonth() + 1;
    진급일자 = 상병진급;
  } else if (Date.now() >= 일병진급.getTime()) {
    n = 1;
    호봉 = new Date().getMonth() - 입대일자.getMonth() + 1;
    진급일자 = 일병진급;
  } else n = 0;

  name.innerText = nameInput.value;
  level.innerText = `${계급[n]}${호봉 == 0 ? '' : `${호봉}호봉`}`;

  let 호봉일자 = new Date();
  호봉일자 = new Date(호봉일자 - 호봉일자.getTime() % DAY);
  호봉일자.setDate(1);
  호봉일자.setMonth(호봉일자.getMonth() + 1);

  if (호봉일자.getTime() >= 전역일자.getTime() || 호봉 == 6) {
    detailContainers[5].style.display = "none";
  }

  details[0].innerText = `${전역일자.toLocaleDateString("ko")}`;
  details[1].innerText = `${Math.ceil((전역일자.getTime() - Date.now()) / DAY)}일`;
  details[2].innerText = `${Math.ceil((Date.now() - 입대일자.getTime()) / DAY)}일`;
  texts[0].innerText = `${계급[n + 1]}이 되기까지`;
  details[3].innerText = `${Math.ceil((진급일자.getTime() - Date.now()) / DAY)}일`;
  texts[1].innerText = `${계급[n]}${호봉 + 1}호봉이 되기까지`;
  details[4].innerText = `${Math.ceil((호봉일자.getTime() - Date.now()) / DAY)}일`;
  details[5].innerText = `${(100 / parseInt((전역일자.getTime() - 입대일자.getTime()) / DAY)).toFixed(4)}%`;
};

const updateGraph = () => {
  if (prevDate != new Date().getDate()) {
    prevDate = new Date().getDate();
    updateSchedule();
  }
  const calc = (Date.now() - 입대일자.getTime()) / (전역일자.getTime() - 입대일자.getTime()) * 100;
  percentage.style.width = `${calc.toFixed(1)}%`;
  pastPercentage.innerText = `${calc.toFixed(7)}%`;
  remainPercentage.innerText = `${(100 - calc).toFixed(1)}%`;
  requestAnimationFrame(updateGraph);
};

window.onload = () => {
  if (localStorage['doriDateString']) {
    nameInput.value = localStorage['doriName'];
    updateSchedule(localStorage['doriDateString']);
  } else {
    updateSchedule();
  }

  updateGraph();
};