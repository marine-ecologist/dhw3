
document.addEventListener("DOMContentLoaded", function() {
  d3.csv("data/OISST_DHWmax.csv").then(data => {
  	
  const meta = data.map(row => ({ id: row.ID, reef: row.Reef, lat: +row.lat }));
  const yearColumns = data.columns.filter(c => !['ID', 'Reef', 'lat'].includes(c));
  const matrix = data.map(row => yearColumns.map(year => +row[year]));
  const baseCellHeight = 5;

  const colorScale = d3.scaleLinear()
    .domain([0, 3, 6, 9, 12, 15, 18, 21])
    .range(["#006f99", "#00A6E5", "#FFD700", "#FF8C00", "#B20000", "#660000", "#3D0000", "#3D0000"]);

  const svg = d3.select("svg");
  const cellWidth = 30;
  const margin = { top: 40, right: 20, bottom: 20, left: 250 };

  function resizeSVG(matrix, cellHeight) {
    svg.attr("width", matrix[0].length * cellWidth + margin.left + margin.right)
       .attr("height", matrix.length * cellHeight + margin.top + margin.bottom);
  }

  function drawRowLabels(meta, cellHeight, labelType = "lat") {
    const seen = new Set();
    svg.selectAll(".rowLabel")
      .data(meta)
      .join("text")
      .attr("class", "rowLabel")
      .attr("x", margin.left - 5)
      .attr("y", (d, i) => margin.top + i * cellHeight + cellHeight * 0.5)
      .attr("text-anchor", "end")
      .attr("alignment-baseline", "middle")
      .attr("fill", "white")
      .attr("font-size", "15px")
      .attr("font-family", "Helvetica")
      .text(d => {
        if (labelType === "id") {
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
  }

  function drawColumnLabels(yearColumns) {
    svg.selectAll(".colLabel")
      .data(yearColumns)
      .join("text")
      .attr("class", "colLabel")
      .attr("x", (d, i) => margin.left + i * cellWidth + cellWidth / 2)
      .attr("y", margin.top - 10)
      .attr("text-anchor", "start")
      .attr("alignment-baseline", "middle")
      .attr("fill", "white")
      .attr("font-size", "12px")
      .attr("font-family", "Helvetica")
      .attr("transform", (d, i) => `rotate(-45, ${margin.left + i * cellWidth + cellWidth / 2}, ${margin.top - 10})`)
      .text(d => d);
  }

  function drawHeatmap(meta, matrix, labelType = "lat") {
    svg.selectAll("*").remove();
    const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);
    const cellHeight = matrix.length < data.length ? baseCellHeight * 5 : baseCellHeight;

    resizeSVG(matrix, cellHeight);
    const container = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    drawColumnLabels(yearColumns);
    drawRowLabels(meta, cellHeight, labelType);

    container.selectAll("g")
      .data(matrix)
      .join("g")
      .attr("transform", (d, i) => `translate(0, ${i * cellHeight})`)
      .each(function(rowData, rowIndex) {
        d3.select(this).selectAll("rect")
          .data(rowData.map((value, colIndex) => ({ value, rowIndex, colIndex })))
          .join("rect")
          .attr("class", "cell")
          .attr("x", d => d.colIndex * cellWidth)
          .attr("width", cellWidth)
          .attr("height", cellHeight)
          .attr("fill", d => isNaN(d.value) ? "#000" : colorScale(d.value))
          .on("mouseover", function(event, d) {
            const m = meta[d.rowIndex];
            const year = yearColumns[d.colIndex];
            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip.html(`ID: ${m.id}<br>Reef: ${m.reef}<br>Latitude: ${m.lat}<br>Year: ${year}<br>DHW: ${d.value}`)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 15) + "px");
          })
          .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));
      });
  }

  function updateHeatmapContainerAlignment(isSubset) {
    document.getElementById('heatmap-container').style.alignItems = isSubset ? 'center' : 'flex-start';
  }

  drawHeatmap(meta, matrix);
  updateHeatmapContainerAlignment(false);

  const sortedMeta = meta.sort((a, b) => a.reef.localeCompare(b.reef));
  
  if (document.querySelector('#reefSelect').tomselect) {
  document.querySelector('#reefSelect').tomselect.destroy();
}


  const select = new TomSelect('#reefSelect', {
    plugins: ['remove_button'],
    placeholder: 'Search by reef name or GBRMPA ID',
    closeAfterSelect: false,
    options: meta.map(d => ({
      value: d.id,
      text: `${d.reef} [${d.id}]`
    })),
    onChange: function(selectedIds) {
      const isSubset = selectedIds.length > 0;

      updateHeatmapContainerAlignment(isSubset);

      if (!isSubset) {
        drawHeatmap(meta, matrix, 'lat');
        return;
      }

      const filteredMeta = meta.filter(d => selectedIds.includes(d.id));
      const filteredMatrix = filteredMeta.map(d => matrix[meta.findIndex(m => m.id === d.id)]);
      drawHeatmap(filteredMeta, filteredMatrix, 'id');
    }
  });
 });
});