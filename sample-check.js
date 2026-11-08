(function () {
  function parseCsv(text) {
    return text
      .replace(/^\uFEFF/, "")
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map(function (line) {
        return line.split(",").map(function (cell) { return cell.trim(); });
      });
  }

  function workforceAnswer(text) {
    var rows = parseCsv(text);
    var header = rows[0].map(function (cell) { return cell.toLowerCase(); });
    var deptIndex = Math.max(0, header.indexOf("department"));
    var needIndex = header.findIndex(function (cell) { return cell.indexOf("reskill") >= 0; });
    if (needIndex < 0) needIndex = header.length - 1;
    var total = 0;
    var sales = 0;
    rows.slice(1).forEach(function (row) {
      if (/total/i.test(row[deptIndex])) return;
      var value = Number(row[needIndex]);
      if (isNaN(value)) return;
      total += value;
      if (row[deptIndex].toLowerCase() === "sales") sales = value;
    });
    return "Answer: " + total.toLocaleString("en-US") + " employees still need reskilling. Sales is " + sales.toLocaleString("en-US") + ". The company total row stays out of the sum, so those people are not counted twice. The included sample is 1,221.";
  }

  function hotelAnswer(text) {
    var rows = parseCsv(text).slice(1);
    var lines = rows.map(function (row) {
      var location = ["EMEA", "NA", "LATAM", "APAC"].indexOf(row[0]) >= 0 ? row[0] : "Unknown";
      var rooms = Number(row[1]);
      var cleanRooms = rooms >= 1 && rooms <= 400 ? rooms : 100;
      var staff = row[2] === "" ? 1.5 * cleanRooms : Number(row[2]);
      var year = Number(row[3]);
      var opening = year >= 2000 && year <= 2023 ? String(year) : "2023";
      var guests = (row[4] || "").toUpperCase().charAt(0) === "B" ? "Business" : "Leisure";
      return location + ", " + cleanRooms + ", " + staff + ", " + opening + ", " + guests;
    });
    return "Answer, cleaned branch rows:\n" + lines.join("\n") + "\n\nUnknown replaces a bad location. 100 replaces a room count outside 1–400. A blank staff count becomes 1.5 times the cleaned room count. 2023 replaces a bad opening year. A guest type that starts with B becomes Business.";
  }

  function flyberAnswer(text) {
    var rows = parseCsv(text);
    var numbers = rows.slice(1).map(function (row) { return Number(row[row.length - 1]); }).filter(function (n) { return !isNaN(n); });
    if (numbers.length < 2) return "Answer: the course sample grows from 790,329 events to 12,788,264, which is 16.2 times in one month.";
    var ratio = numbers[numbers.length - 1] / numbers[0];
    return "Answer: events grow from " + numbers[0].toLocaleString("en-US") + " to " + numbers[numbers.length - 1].toLocaleString("en-US") + ", which is " + ratio.toFixed(1) + " times. The course sample is 16.2 times in one month. This is analysis on a course dataset.";
  }

  var projects = {
    flyber: {
      sample: "date,total_event\n2019-09-11,790329\n2019-10-11,12788264",
      answer: flyberAnswer
    },
    hotel: {
      sample: "location,total_rooms,staff_count,opening_date,target_guests\nEMEA,220,40,2014,Business\nMars,900,,1990,Busniess",
      answer: hotelAnswer
    },
    workforce: {
      sample: "Department,Employees Needing Reskilling\nProduct Engineering,380\nData Science and AI,75\nProduct Management,54\nCustomer Success,210\nSales,173\nMarketing,34\nFinance,27\nHR and People Ops,27\nLegal and Compliance,11\nIT and Infrastructure,18\nG&A / Operations,11\nAcquired: TeamSync,82\nAcquired: DataBridge,86\nAcquired: CloudOps,33\nCOMPANY TOTAL,1221",
      answer: workforceAnswer
    }
  };

  document.querySelectorAll("[data-sample]").forEach(function (root) {
    var project = projects[root.getAttribute("data-sample")];
    if (!project) return;
    var preview = root.querySelector("[data-preview]");
    var answer = root.querySelector("[data-answer]");
    var status = root.querySelector("[data-file-status]");
    var loaded = project.sample;

    function showSample() {
      preview.hidden = false;
      preview.textContent = loaded;
    }

    showSample();

    root.querySelector("[data-show-answer]").addEventListener("click", function () {
      answer.hidden = false;
      answer.textContent = project.answer(loaded);
    });

    root.querySelector("[data-upload]").addEventListener("change", function (event) {
      var file = event.target.files && event.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        loaded = String(reader.result || "");
        status.textContent = "Loaded " + file.name + ". The file stays in this browser.";
        answer.hidden = true;
        showSample();
      };
      reader.readAsText(file);
    });
  });
})();
