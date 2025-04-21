// D3 Heatmap with sticky header and fixed column labels

// Ensure all code runs after DOM is ready
document.addEventListener("DOMContentLoaded", function() {

  let currentDataset = 'https://raw.githubusercontent.com/marine-ecologist/dhw3/refs/heads/main/data/CRW_DHWmax.csv';
  let currentSelectedReefs = [];
  let currentRowHeight = 1.5;
  let userSelectedRowHeight = currentRowHeight;

  const fixedHeatmapWidth = 1550;
  const heatmapContainer = document.getElementById('heatmap-container');
  const svg = d3.select("#heatmap-svg");
  const colLabelsSvg = d3.select("#col-labels-svg");

  let reefSelect, rowHeightSlider;
  let currentMeta, currentMatrix, yearColumns;

  const style = document.createElement('style');
  style.textContent = `
    body {
      background-color: #333;
      color: white;
      font-family: Helvetica;
      margin: 0;
      padding: 0;
    }
    #header {
      position: sticky;
      top: 0;
      background: #333;
      z-index: 101;
      display: flex;
      justify-content: space-between;
      width: 100%;
      box-sizing: border-box;
      padding: 5px 40px 0px 40px;
    }
    .tooltip {
      position: absolute;
      text-align: left;
      padding: 5px;
      background: white;
      border: 1px solid #ccc;
      pointer-events: none;
      font-size: 12px;
      color: black;
      z-index: 1000;
      width: 120px;
    }
    #heatmap-container {
      margin: 0;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      width: 100%;
      position: relative;
    }
    #col-labels-wrapper {
      position: sticky;
      top: 40px; /* push below header */
      background: #333;
      z-index: 100;
      width: fit-content;
      margin-left: 0px;
    }
    #col-labels-svg {
      display: block;
    }
    #heatmap-scroll {
      overflow-x: auto;
      overflow-y: hidden;
      width: 100%;
    }
    #heatmap-wrapper {
      display: flex;
      flex-direction: column;
      width: fit-content;
    }
    svg {
      display: block;
    }
    .cell {
      stroke: none;
    }
  `;
  document.head.appendChild(style);

  buildHeader();

  function buildHeader() {
    let header = document.getElementById('header');
    if (!header) {
      header = document.createElement('div');
      header.id = 'header';
      heatmapContainer.insertBefore(header, heatmapContainer.firstChild);
    } else {
      header.innerHTML = '';
    }

    const leftContainer = document.createElement('div');
    leftContainer.style.display = 'flex';
    leftContainer.style.alignItems = 'center';
    leftContainer.style.gap = '20px';

    const datasetWrapper = document.createElement('div');
    datasetWrapper.style.display = 'flex';
    datasetWrapper.style.alignItems = 'center';
    datasetWrapper.style.gap = '6px';

    const datasetLabel = document.createElement('i');
    datasetLabel.className = 'fa-solid fa-database';
    datasetLabel.title = 'Select dataset';
    datasetLabel.style.color = 'white';
    datasetLabel.style.fontSize = '16px';
    datasetLabel.style.cursor = 'pointer';

    const datasetSelect = document.createElement('select');
    datasetSelect.style.width = '180px';
    datasetSelect.style.background = '#333';
    datasetSelect.style.color = 'white';
    datasetSelect.style.border = '1px solid #004a5c';
    datasetSelect.style.borderRadius = '4px';

    const datasets = [
      { name: 'CoralTemp v3.1', value: 'https://raw.githubusercontent.com/marine-ecologist/dhw3/refs/heads/main/data/CRW_DHWmax.csv' },
      { name: 'OISST v2.1', value: 'https://raw.githubusercontent.com/marine-ecologist/dhw3/refs/heads/main/data/OISST_DHWmax.csv' },
      { name: 'ERA v5', value: 'https://raw.githubusercontent.com/marine-ecologist/dhw3/refs/heads/main/data/ERA5_DHWmax.csv' }
    ];

    datasets.forEach(d => {
      const option = document.createElement('option');
      option.value = d.value;
      option.textContent = d.name;
      datasetSelect.appendChild(option);
    });

    datasetSelect.value = currentDataset;
    datasetSelect.addEventListener('change', () => {
      currentDataset = datasetSelect.value;
      loadData(currentDataset);
    });

    datasetWrapper.appendChild(datasetLabel);
    datasetWrapper.appendChild(datasetSelect);
    leftContainer.appendChild(datasetWrapper);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0.25;
    slider.max = 10;
    slider.step = 0.1;
    slider.value = currentRowHeight;
    slider.style.cursor = 'pointer';
    slider.addEventListener('input', function () {
      userSelectedRowHeight = +this.value;
      if (currentSelectedReefs.length === 0) {
        currentRowHeight = userSelectedRowHeight;
        drawHeatmap(currentMeta, currentMatrix);
      }
    });
    rowHeightSlider = slider;
    leftContainer.appendChild(slider);

    const rightContainer = document.createElement('div');
    rightContainer.style.display = 'flex';
    rightContainer.style.alignItems = 'center';
    rightContainer.style.gap = '10px';

    const selectElement = document.createElement('select');
    selectElement.id = 'reefSelect';
    selectElement.multiple = true;
    selectElement.style.width = '400px';
    selectElement.style.paddingLeft = '100px';

    const clearButton = document.createElement('i');
    clearButton.className = 'fa-solid fa-circle-xmark';
    clearButton.title = 'Clear selection';
    clearButton.style.fontSize = '20px';
    clearButton.style.color = '#FFF';
    clearButton.style.cursor = 'pointer';

    clearButton.addEventListener('click', () => {
      if (selectElement.tomselect) {
        selectElement.tomselect.clear();
        currentSelectedReefs = [];
        currentRowHeight = userSelectedRowHeight;
        rowHeightSlider.value = userSelectedRowHeight;
        drawHeatmap(currentMeta, currentMatrix);
      }
    });

    rightContainer.appendChild(selectElement);
    rightContainer.appendChild(clearButton);

    header.appendChild(leftContainer);
    header.appendChild(rightContainer);

    reefSelect = selectElement;
  }

  function loadData(dataset) {
    d3.csv(dataset).then(data => {
      currentMeta = data.map(row => ({ id: row.ID, reef: row.Reef, lat: +row.lat }));
      yearColumns = data.columns.filter(c => !['ID', 'Reef', 'lat'].includes(c));
      currentMatrix = data.map(row => yearColumns.map(year => +row[year]));
      setupTomSelect(currentMeta);
      drawHeatmap(currentMeta, currentMatrix);
    });
  }

  function getRowHeight() {
    return currentSelectedReefs.length > 0 ? 20 : userSelectedRowHeight;
  }

  function drawHeatmap(meta, matrix) {
    svg.selectAll("*").remove();
    colLabelsSvg.selectAll("*").remove();
    d3.selectAll('.tooltip').remove();

    const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);
    const rowHeight = getRowHeight();
    const cellWidth = fixedHeatmapWidth / yearColumns.length * 0.8;

    svg.attr("width", fixedHeatmapWidth + 66).attr("height", matrix.length * rowHeight + 40);
    const container = svg.append("g").attr("transform", `translate(66,0)`);
    colLabelsSvg.attr("width", fixedHeatmapWidth + 66).attr("height", 40);

    colLabelsSvg.selectAll(".colLabel")
      .data(yearColumns)
      .join("text")
      .attr("class", "colLabel")
      .attr("x", (d, i) => 64 + i * cellWidth + cellWidth / 2)
      .attr("y", 30)
      .attr("text-anchor", "start")
      .attr("alignment-baseline", "center")
      .attr("fill", "white")
      .attr("font-size", "12px")
      .attr("transform", (d, i) => `rotate(-45, ${66 + i * cellWidth + cellWidth / 2}, 25)`)
      .text(d => `${d}`);

    const seen = new Set();
    svg.selectAll(".rowLabel")
      .data(meta)
      .join("text")
      .attr("class", "rowLabel")
      .attr("x", 55)
      .attr("y", (d, i) => 40 + i * rowHeight + rowHeight * 0.5)
      .attr("text-anchor", "end")
      .attr("alignment-baseline", "middle")
      .attr("fill", "white")
      .attr("font-size", "15px")
      .text(d => {
        if (currentSelectedReefs.length > 0) return `${d.reef} [${d.id}]`;
        const roundedLat = d.lat.toFixed(1);
        if (!seen.has(roundedLat)) {
          seen.add(roundedLat);
          const degrees = Math.floor(Math.abs(d.lat));
          const minutes = Math.round((Math.abs(d.lat) - degrees) * 60);
          return `${degrees}°${minutes.toString().padStart(2, '0')}'`;
        }
        return "";
      });

    matrix.forEach((rowData, rowIndex) => {
      const row = container.append("g").attr("transform", `translate(0, ${rowIndex * rowHeight})`);

      row.selectAll("rect")
        .data(rowData.map((value, colIndex) => ({ value, rowIndex, colIndex })))
        .enter()
        .append("rect")
        .attr("class", "cell")
        .attr("x", d => d.colIndex * cellWidth)
        .attr("width", cellWidth)
        .attr("height", rowHeight)
        .attr("fill", d => isNaN(d.value) ? "#000" : d3.scaleLinear()
          .domain([0, 3, 6, 9, 12, 15, 18, 21])
          .range(["#006f99", "#00A6E5", "#FFD700", "#FF8C00", "#B20000", "#550000", "#3D0000", "#3D0000"])(d.value))
        .on("mouseover", function (event, d) {
          const m = meta[d.rowIndex];
          const year = yearColumns[d.colIndex];
          tooltip.transition().duration(200).style("opacity", 0.9);
          tooltip.html(`<b>ID:</b> ${m.id}<br><b>Reef:</b> ${m.reef}<br><b>Latitude:</b> ${m.lat}<br><b>Year:</b> ${year}<br><b>DHW:</b> ${d.value}`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 15) + "px");
        })
        .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));
    });
  }

  function setupTomSelect(meta) {
    if (reefSelect.tomselect) reefSelect.tomselect.destroy();
    const sortedOptions = meta.slice().sort((a, b) => a.reef.localeCompare(b.reef));

    new TomSelect(reefSelect, {
      plugins: ['remove_button'],
      placeholder: 'Search by reef name or GBRMPA ID',
      closeAfterSelect: false,
      options: sortedOptions.map(d => ({ value: d.id, text: `${d.reef} [${d.id}]` })),
      maxOptions: null,
      items: currentSelectedReefs,
      onItemAdd() {
        currentSelectedReefs = this.items;
        currentRowHeight = 20;
        rowHeightSlider.value = currentRowHeight;
        this.setTextboxValue('');
        applyFilter();
      },
      
      onItemRemove() {
        currentSelectedReefs = this.items;
        currentRowHeight = this.items.length > 0 ? 20 : userSelectedRowHeight;
        rowHeightSlider.value = currentRowHeight;
        applyFilter();
      },
      onChange(selectedIds) {
        currentSelectedReefs = selectedIds;
        currentRowHeight = selectedIds.length > 0 ? 20 : userSelectedRowHeight;
        rowHeightSlider.value = currentRowHeight;
        applyFilter();
      }
      
    });
  }

  function applyFilter() {
    if (currentSelectedReefs.length === 0) {
      drawHeatmap(currentMeta, currentMatrix);
    } else {
      const filteredMeta = currentMeta.filter(d => currentSelectedReefs.includes(d.id));
      const filteredMatrix = filteredMeta.map(d => {
        const idx = currentMeta.findIndex(m => m.id === d.id);
        return idx !== -1 ? currentMatrix[idx] : [];
      });
      drawHeatmap(filteredMeta, filteredMatrix);
    }
  }

  loadData(currentDataset);
});
