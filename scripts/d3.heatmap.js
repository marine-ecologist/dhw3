// Canvas Version: 0.3.0 ✅

// ✅ Clean rebuild with enforced rowHeight rendering
// ✅ Removed interfering CSS (scale, fixed height overrides)
// ✅ Subset view uses rowHeight = 20, reset to slider on clear
// ✅ Show reef IDs when subset is active

// START

document.addEventListener("DOMContentLoaded", function() {

  let currentDataset = 'data/CRW_DHWmax.csv';
  let currentSelectedReefs = [];
  let currentRowHeight = 1.5;
  let userSelectedRowHeight = currentRowHeight;

  const fixedHeatmapWidth = 1200;
  const heatmapContainer = document.getElementById('heatmap-container');
  const svg = d3.select("svg");

  let reefSelect, rowHeightSlider;
  let currentMeta, currentMatrix, yearColumns;

  buildHeader();

  function buildHeader() {
    let header = document.getElementById('header');
    if (!header) {
      header = document.createElement('div');
      header.id = 'header';
      header.style.position = 'sticky';
      header.style.top = '0';
      header.style.background = '#333';
      header.style.zIndex = '100';
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.width = '85%';
      header.style.boxSizing = 'border-box';
      header.style.padding = '5px 40px 20px 280px';
      heatmapContainer.parentNode.insertBefore(header, heatmapContainer);
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
	datasetWrapper.style.gap = '6px'; // space between icon and dropdown

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
      { name: 'CoralTemp v3.1', value: 'data/CRW_DHWmax.csv' },
      { name: 'OISST v2.1', value: 'data/OISST_DHWmax.csv' },
      { name: 'ERA v5', value: 'data/ERA5_DHWmax.csv' }
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

const spacer = document.createElement('div');
spacer.style.width = '30px';
leftContainer.appendChild(spacer);

    const sliderWrapper = document.createElement('div');
sliderWrapper.style.display = 'flex';
sliderWrapper.style.alignItems = 'center';
sliderWrapper.style.gap = '8px';
sliderWrapper.style.color = 'white';

// Left icon
const zoomOutIcon = document.createElement('i');
zoomOutIcon.className = 'fa-solid fa-magnifying-glass-minus';

// Right icon
const zoomInIcon = document.createElement('i');
zoomInIcon.className = 'fa-solid fa-magnifying-glass-plus';

// Slider
const slider = document.createElement('input');
slider.type = 'range';
slider.min = 0.25;
slider.max = 20;
slider.step = 0.1;
slider.value = currentRowHeight;
slider.style.cursor = 'pointer';

slider.addEventListener('input', function() {
  userSelectedRowHeight = +this.value;
  if (currentSelectedReefs.length === 0) {
    currentRowHeight = userSelectedRowHeight;
    drawHeatmap(currentMeta, currentMatrix);
  }
});

sliderWrapper.appendChild(zoomOutIcon);
sliderWrapper.appendChild(slider);
sliderWrapper.appendChild(zoomInIcon);

leftContainer.appendChild(sliderWrapper);

    const rightContainer = document.createElement('div');
    rightContainer.style.display = 'flex';
    rightContainer.style.alignItems = 'center';
    rightContainer.style.gap = '10px';

    const selectElement = document.createElement('select');
    selectElement.id = 'reefSelect';
    selectElement.multiple = true;
    selectElement.style.width = '400px';

    const clearButton = document.createElement('button');
    clearButton.innerHTML = 'Clear<br>selection';
    clearButton.style.background = '#005f75';
    clearButton.style.color = 'white';
    clearButton.style.border = 'none';
    clearButton.style.padding = '0 12px';
    clearButton.style.borderRadius = '4px';
    clearButton.style.cursor = 'pointer';
    clearButton.style.lineHeight = '1.2';

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

    const style = document.createElement('style');
    style.textContent = `
      body {
        background-color: #333;
        color: white;
        font-family: Helvetica;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        height: 100vh;
        align-items: center;
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
        flex: 1;
        overflow: auto;
        margin-top: 0;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        position: relative;
      }
      svg {
        display: block;
      }
      .cell {
        stroke: none;
      }
    `;
    document.head.appendChild(style);

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
    d3.selectAll('.tooltip').remove();

    const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);

    const rowHeight = getRowHeight();

    heatmapContainer.style.alignItems = currentSelectedReefs.length > 0 ? 'center' : 'flex-start';

    const cellWidth = fixedHeatmapWidth / yearColumns.length;

    svg.attr("width", fixedHeatmapWidth + 250 + 20)
       .attr("height", matrix.length * rowHeight + 40 + 20);

    const container = svg.append("g").attr("transform", `translate(250,40)`);

    const seen = new Set();
    svg.selectAll(".rowLabel")
      .data(meta)
      .join("text")
      .attr("class", "rowLabel")
      .attr("x", 250 - 5)
      .attr("y", (d, i) => 40 + i * rowHeight + rowHeight * 0.5)
      .attr("text-anchor", "end")
      .attr("alignment-baseline", "middle")
      .attr("fill", "white")
      .attr("font-size", "15px")
      .text(d => {
        if (currentSelectedReefs.length > 0) {
          return `${d.reef} [${d.id}]`;
        } else {
          const roundedLat = d.lat.toFixed(1);
          if (!seen.has(roundedLat)) {
            seen.add(roundedLat);
            const absLat = Math.abs(d.lat);
            const degrees = Math.floor(absLat);
            const minutes = Math.round((absLat - degrees) * 60);
            return `${degrees}°${minutes.toString().padStart(2, '0')}'`;
          }
          return "";
        }
      });

    svg.selectAll(".colLabel")
      .data(yearColumns)
      .join("text")
      .attr("class", "colLabel")
      .attr("x", (d, i) => 250 + i * cellWidth + cellWidth / 2)
      .attr("y", 40 - 10)
      .attr("text-anchor", "start")
      .attr("alignment-baseline", "middle")
      .attr("fill", "white")
      .attr("font-size", "12px")
      .attr("transform", (d, i) => `rotate(-45, ${250 + i * cellWidth + cellWidth / 2}, ${40 - 10})`)
      .text(d => d);

    const colorScale = d3.scaleLinear()
      .domain([0, 3, 6, 9, 12, 15, 18, 21])
      .range(["#006f99", "#00A6E5", "#FFD700", "#FF8C00", "#B20000", "#660000", "#3D0000", "#3D0000"]);

    container.selectAll("g").remove();

    matrix.forEach((rowData, rowIndex) => {
      const row = container.append("g")
        .attr("transform", `translate(0, ${rowIndex * rowHeight})`);

      row.selectAll("rect")
        .data(rowData.map((value, colIndex) => ({ value, rowIndex, colIndex })))
        .enter()
        .append("rect")
        .attr("class", "cell")
        .attr("x", d => d.colIndex * cellWidth)
        .attr("width", cellWidth)
        .attr("height", rowHeight)
        .attr("fill", d => isNaN(d.value) ? "#000" : colorScale(d.value))
        .on("mouseover", function(event, d) {
      const m = meta[d.rowIndex];
      const year = yearColumns[d.colIndex];
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip.html(
        `<b>ID:</b> ${m.id}<br>
         <b>Reef:</b> ${m.reef}<br>
         <b>Latitude:</b> ${m.lat}<br>
         <b>Year:</b> ${year}<br>
         <b>DHW:</b> ${d.value}`
      )
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
      onItemAdd: function() {
        currentSelectedReefs = this.items;
        currentRowHeight = 20;
        rowHeightSlider.value = currentRowHeight;
        applyFilter();
      },
      onItemRemove: function() {
        currentSelectedReefs = this.items;
        currentRowHeight = this.items.length > 0 ? 20 : userSelectedRowHeight;
        rowHeightSlider.value = currentRowHeight;
        applyFilter();
      },
      onChange: function(selectedIds) {
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
      const filteredMatrix = filteredMeta.map(d => currentMatrix[currentMeta.findIndex(m => m.id === d.id)]);
      drawHeatmap(filteredMeta, filteredMatrix);
    }
  }

  loadData(currentDataset);

});
