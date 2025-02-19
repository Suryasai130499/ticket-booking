let user_data = {};

function getMsg(msg_type, msg_body) {
  return {
    msg: {
      type: msg_type,
      data: msg_body,
    },
    sender: "content_script",
    id: "irctc",
  };
}
function statusUpdate(status) {
  chrome.runtime.sendMessage(
    getMsg("status_update", { status, time: Date.now() })
  );
}

function addDelay(milliseconds) {
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < milliseconds);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(message, sender, "content_script");
  if (message.id !== "irctc") {
    sendResponse("Invalid Id");
    return;
  }
  const type = message.msg.type;
  if (type === "selectJourney") {
    addDelay(200);
    selectJourney();
  } else if (type === "fillPassengerDetails") {
    addDelay(200);
    fillPassengerDetails();
  }
  sendResponse("Something went wrong");
});

function loadLoginDetails() {
  statusUpdate("login_started");
  const loginModal = document.querySelector("#divMain > app-login");
  const userNameInput = loginModal.querySelector(
    "input[type='text'][formcontrolname='userid']"
  );
  const passwordInput = loginModal.querySelector(
    "input[type='password'][formcontrolname='password']"
  );
  const submitBtn = loginModal.querySelector("button[type='submit']");

  userNameInput.value = user_data["irctc_credentials"]["user_name"] ?? "";
  userNameInput.dispatchEvent(new Event("input"));
  userNameInput.dispatchEvent(new Event("change"));

  passwordInput.value = user_data["irctc_credentials"]["password"] ?? "";
  passwordInput.dispatchEvent(new Event("input"));
  passwordInput.dispatchEvent(new Event("change"));
  statusUpdate("login_pending");
}

function loadJourneyDetails() {
  statusUpdate("filling_journey_details");
  const form = document.querySelector("app-jp-input form");
  const fromInputField = form.querySelector("#origin > span > input");
  fromInputField.value = user_data["journey_details"]["from"]
    ? `${user_data["journey_details"]["from"]["english_label"]} - ${user_data["journey_details"]["from"]["station_code"]}`
    : "";
  fromInputField.dispatchEvent(new Event("keydown"));
  fromInputField.dispatchEvent(new Event("input"));

  const destinationInputField = form.querySelector(
    "#destination > span > input"
  );
  destinationInputField.value = user_data["journey_details"]["destination"]
    ? `${user_data["journey_details"]["destination"]["english_label"]} - ${user_data["journey_details"]["destination"]["station_code"]}`
    : "";
  destinationInputField.dispatchEvent(new Event("keydown"));
  destinationInputField.dispatchEvent(new Event("input"));

  const dateInputField = form.querySelector("#jDate > span > input");
  dateInputField.value = user_data["journey_details"]["date"]
    ? `${user_data["journey_details"]["date"].split("-").reverse().join("/")}`
    : "";
  dateInputField.dispatchEvent(new Event("keydown"));
  dateInputField.dispatchEvent(new Event("input"));

  const jClassField = form.querySelector("#journeyClass");
  const jClassArrowBtn = jClassField.querySelector("div > div[role='button']");
  jClassArrowBtn.click();
  addDelay(300);
  [...jClassField.querySelectorAll("ul li")]
    .filter(
      (e) =>
        e.innerText === user_data["journey_details"]["class"]["label"] ?? ""
    )[0]
    ?.click(); //handle error here
  addDelay(300);

  const quotaField = form.querySelector("#journeyQuota");
  const quotaArrowBtn = quotaField.querySelector("div > div[role='button']");
  quotaArrowBtn.click();
  [...quotaField.querySelectorAll("ul li")]
    .filter(
      (e) =>
        e.innerText === user_data["journey_details"]["quota"]["label"] ?? ""
    )[0]
    ?.click(); //handle error here

  const searchBtn = form.querySelector(
    "button.search_btn.train_Search[type='submit']"
  );
  addDelay(500);
  statusUpdate("filled_journey_details");

  if (
    user_data["journey_details"]["quota"]["label"] === "TATKAL" ||
    (user_data["journey_details"]["quota"]["label"] === "PREMIUM TATKAL" &&
      user_data["extension_data"]["book_at_tatkal_time"] === true)
  ) {
    const jclass = user_data["journey_details"]["class"]["value"];
    let currentDate = new Date();
    let requiredDate = new Date();
    ["1A", "2A", "3A", "CC", "EC", "3E"].includes(jclass.toUpperCase())
      ? requiredDate.setHours(10, 0o0, 0o0, 0o0)
      : requiredDate.setHours(11, 0o0, 0o0, 0o0);

    if (requiredDate > currentDate) {
      console.log("asdas");
      setTimeout(() => {
        searchBtn.click();
      }, 10);
    } else {
      searchBtn.click();
    }
  } else {
    searchBtn.click();
  }
}

function selectJourney() {
  if (!user_data["journey_details"]["train-no"]) return;

  statusUpdate("journey_selection_started");
  const train_list_parent = document.querySelector(
    "#divMain > div > app-train-list"
  );
  const train_list = [
    ...train_list_parent.querySelectorAll(".tbis-div app-train-avl-enq"),
  ];
  console.log(user_data["journey_details"]["train-no"]);
  const myTrain = train_list.filter((train) =>
    train
      .querySelector("div.train-heading")
      .innerText.trim()
      .includes(user_data["journey_details"]["train-no"])
  )[0];

  if (!myTrain) {
    statusUpdate("journey_selection_stopped.no_train");
    return;
  }

  const jClass = user_data["journey_details"]["class"]["label"];
  const tempDate = new Date(user_data["journey_details"]["date"])
    .toString()
    .split(" ");
  const myClassToClick = [
    ...myTrain.querySelectorAll("table tr td div.pre-avl"),
  ].filter((c) => c.querySelector("div").innerText === jClass)[0];

  const config = { attributes: false, childList: true, subtree: true };
  [...myTrain.querySelectorAll("table tr td div.pre-avl")]
    .filter((c) => c.querySelector("div").innerText === jClass)[0]
    ?.click();

  const fetchAvailableSeatsCallback = (mutationList, observer) => {
    console.log("fetchAvailableSeatsCallback -1", Date.now());
    addDelay(800);
    console.log("fetchAvailableSeatsCallback -2", Date.now());
    const myClassToClick = [
      ...myTrain.querySelectorAll("table tr td div.pre-avl"),
    ].filter((c) => c.querySelector("div").innerText === jClass)[0];
    const myClassTabToClick = [
      ...myTrain.querySelectorAll(
        "div p-tabmenu ul[role='tablist'] li[role='tab']"
      ),
    ].filter((c) => c.querySelector("div").innerText === jClass)[0];
    const myClassTabToSelect = [
      ...myTrain.querySelectorAll("div div table td div.pre-avl"),
    ].filter(
      (c) =>
        c.querySelector("div").innerText ===
        `${tempDate[0]}, ${tempDate[2]} ${tempDate[1]}`
    )[0];

    const bookBtn = myTrain.querySelector(
      "button.btnDefault.train_Search.ng-star-inserted"
    );
    if (myClassToClick) {
      console.log(1);
      if (myClassToClick.classList.contains("selected-class")) {
        console.log(2);
        statusUpdate("journey_selection_completed");
        addDelay(300);
        bookBtn.click();
        observer.disconnect();
      } else {
        console.log(3);
        addDelay(300);
        myClassToClick.click();
      }
    } else if (myClassTabToClick) {
      console.log(4);
      if (!myClassTabToClick.classList.contains("ui-state-active")) {
        console.log(5);
        addDelay(300);
        myClassTabToClick.click();
        return;
      } else if (myClassTabToSelect) {
        console.log(6);
        if (myClassTabToSelect.classList.contains("selected-class")) {
          console.log(7);
          addDelay(500);
          bookBtn.click();
          observer.disconnect();
        } else {
          console.log(8, Date.now());
          addDelay(500);
          myClassTabToSelect.click();
          console.log(9, Date.now());
        }
      }
    }
  };
  const observer = new MutationObserver(fetchAvailableSeatsCallback);
  observer.observe(myTrain, config);
}

function fillPassengerDetails() {
  statusUpdate("passenger_filling_started");
  const parentElement = document.querySelector("app-passenger-input");
  let count = 1;
  while (count < user_data["passenger_details"].length) {
    addDelay(200);
    parentElement
      .querySelector(
        "#ui-panel-13-content > div > div:nth-child(2) > div.zeroPadding.pull-left.ng-star-inserted > a > span:nth-child(1)"
      )
      ?.click();
    count++;
  }
  count = 0;
  const passengerList = [...parentElement.querySelectorAll("app-passenger")];

  // passenger details
  user_data["passenger_details"].forEach((passenger, index) => {
    let name_input_field = passengerList[index].querySelector(
      "p-autocomplete[formcontrolname='passengerName'] input[placeholder='Name']"
    );
    name_input_field.value = passenger.name;
    name_input_field.dispatchEvent(new Event("input"));
    let age_input_field = passengerList[index].querySelector(
      "input[type='number'][formcontrolname='passengerAge']"
    );
    age_input_field.value = passenger.age;
    age_input_field.dispatchEvent(new Event("input"));
    let gender_select_field = passengerList[index].querySelector(
      "select[formcontrolname='passengerGender']"
    );
    gender_select_field.value = passenger.gender;
    gender_select_field.dispatchEvent(new Event("change"));
    let berth_select_field = passengerList[index].querySelector(
      "select[formcontrolname='passengerBerthChoice']"
    );
    berth_select_field.value = passenger.berth;
    berth_select_field.dispatchEvent(new Event("change"));
  });

  // contact details
  let number_input_field = parentElement.querySelector(
    "input#mobileNumber[formcontrolname='mobileNumber'][name='mobileNumber']"
  );
  number_input_field.value = user_data["contact_details"].mobileNumber;
  number_input_field.dispatchEvent(new Event("input"));

  // Other preferences
  let autoUpgradationInput = parentElement.querySelector(
    "input#autoUpgradation[type='checkbox'][formcontrolname='autoUpgradationSelected']"
  );
  if (autoUpgradationInput)
    autoUpgradationInput.checked =
      user_data["other_preferences"]["autoUpgradation"] ?? false;

  let confirmberthsInput = parentElement.querySelector(
    "input#confirmberths[type='checkbox'][formcontrolname='bookOnlyIfCnf']"
  );
  if (confirmberthsInput)
    confirmberthsInput.checked =
      user_data["other_preferences"]["confirmberths"] ?? false;

  let preferredCoachInput = parentElement.querySelector(
    "input[formcontrolname='coachId']"
  );
  if (preferredCoachInput)
    preferredCoachInput.value = user_data["other_preferences"]["coachId"];

  const reservationChoiceField = parentElement.querySelector(
    "p-dropdown[formcontrolname='reservationChoice']"
  );
  if (reservationChoiceField) {
    const reservationChoiceArrowBtn = reservationChoiceField.querySelector(
      "div > div[role='button']"
    );
    reservationChoiceArrowBtn.click();
    addDelay(300);
    [...reservationChoiceField.querySelectorAll("ul li")]
      .filter(
        (e) =>
          e.innerText === user_data["other_preferences"]["reservationChoice"] ??
          ""
      )[0]
      ?.click(); //handle error here
  }
  // insurance details
  let insuranceOptionsRadios = [
    ...parentElement.querySelectorAll(
      `p-radiobutton[formcontrolname='travelInsuranceOpted'] input[type='radio'][name='travelInsuranceOpted-0']`
    ),
  ];
  addDelay(400);
  insuranceOptionsRadios
    .filter(
      (r) =>
        r.value ===
        (user_data["travel_preferences"].travelInsuranceOpted === "yes"
          ? "true"
          : "false")
    )[0]
    ?.click();

  // payment details
  let paymentOptionsRadios = [
    ...parentElement.querySelectorAll(
      `p-radiobutton[formcontrolname='paymentType'][name='paymentType'] input[type='radio']`
    ),
  ];

  addDelay(300);
  paymentOptionsRadios
    .filter(
      (r) => r.value === user_data["payment_preferences"].paymentType.toString()
    )[0]
    ?.click();

  addDelay(1000);
  submitPassengerDetailsForm();

  const config = {
    attributes: true,
    childList: true,
    subtree: true,
    attributeOldValue: true,
    characterDataOldValue: true,
  };
}

function submitPassengerDetailsForm(parentElement) {
  statusUpdate("passenger_filling_completed");
  console.log("completed", Date.now());
  console.log("document.readyState", document.readyState);
  statusUpdate("passenger_data_submitting");
  // submit form
  addDelay(800);
  console.log("submitting", Date.now());
  document
    .querySelector(
      "#psgn-form > form > div > div.col-lg-9.col-md-9.col-sm-12.remove-padding > div.col-xs-12.hidden-xs > div > button.train_Search.btnDefault"
    )
    .click();
  statusUpdate("passenger_data_submitted");
}

function continueScript() {
  statusUpdate("continue_script");
  const loginBtn = document.querySelector(
    "body > app-root > app-home > div.header-fix > app-header > div.col-sm-12.h_container > div.text-center.h_main_div > div.row.col-sm-12.h_head1 > a.search_btn.loginText.ng-star-inserted"
  );
  if (window.location.href.includes("train-search")) {
    if (loginBtn.innerText.trim().toUpperCase() === "LOGOUT") {
      loadJourneyDetails();
    }
    if (loginBtn.innerText.trim().toUpperCase() === "LOGIN") {
      loginBtn.click();
      loadLoginDetails();
    }
  } else if (window.location.href.includes("nget/booking/train-list")) {
    console.log("nget/booking/train-list");
  } else {
    console.log("No script ahead");
  }
}

window.onload = function (e) {
  const loginBtn = document.querySelector(
    "body > app-root > app-home > div.header-fix > app-header > div.col-sm-12.h_container > div.text-center.h_main_div > div.row.col-sm-12.h_head1 "
  );
  const config = { attributes: false, childList: true, subtree: false };
  const loginDetectorCallback = (mutationList, observer) => {
    if (
      mutationList.filter(
        (m) =>
          m.type === "childList" &&
          m.addedNodes.length > 0 &&
          [...m.addedNodes].filter(
            (n) => n?.innerText?.trim()?.toUpperCase() === "LOGOUT"
          ).length > 0
      ).length > 0
    ) {
      observer.disconnect();
      loadJourneyDetails();
    } else {
      loginBtn.click();
      loadLoginDetails();
    }
  };
  const observer = new MutationObserver(loginDetectorCallback);
  observer.observe(loginBtn, config);

  console.log("content script attached");
  chrome.storage.local.get(null, (result) => {
    user_data = result;
    continueScript();
  });
};
