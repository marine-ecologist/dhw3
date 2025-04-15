library(tidyverse)
library(sf)
library(RColorBrewer)
library(dhw)
library(terra)

# --- Load data ---
GBR_OISST <- rast("/Users/rof011/GBR-dhw/datasets/GBR_2025_OISST_DHW.rds")
GBR_CRW <- rast("/Users/rof011/GBR-dhw/datasets/GBR_CoralTemp_DHW_full.rds")
GBR_ERA5 <- rast("/Users/rof011/GBR-dhw/datasets/GBR_ERA5_full.rds")

gbr_reefs_base<- download_gbr_spatial(return = "base") |> st_transform(4326)
gbr_reefs <- download_gbr_spatial(return = "combined") |> st_transform(4326)
GBRMPpolygon <- vect(gbr_reefs |> st_transform(4326))



# --- Summarise rasters ---

# OISST
OISST_climatology <- create_climatology(GBR_OISST)

OISST_DHW <- summarise_raster(input = OISST_climatology$dhw,
                              index = "years",
                              fun = max,
                              cores=10,
                              overwrite = TRUE) %>%
  extract_reefs(., gbr_reefs,
                varname="dhw")

# CRW
CRW_DHW <- summarise_raster(input = GBR_CRW,
                            index = "years",
                            fun = max,
                            cores=10,
                            overwrite = TRUE) %>%
  extract_reefs(., gbr_reefs,
                varname="dhw")


# ERA5
ERA5_climatology <- create_climatology(GBR_ERA5)

ERA5_DHW <- summarise_raster(input = ERA5_climatology$dhw,
                              index = "years",
                              fun = max,
                              cores=10,
                              overwrite = TRUE) %>%
  extract_reefs(., gbr_reefs,
                varname="dhw")


# --- Extract centroids for heatmap


extract_heatmap <- function(input, start_year){

  output <- input %>%
    sf::st_centroid() %>%
    dplyr::mutate(
      lon = sf::st_coordinates(.)[, 1],
      lat = sf::st_coordinates(.)[, 2]
    ) %>%
    sf::st_drop_geometry() %>%
    as.data.frame() |>
    dplyr::rename(year = date) |>
    dplyr::mutate(dhw = round(dhw,1)) |>
    dplyr::mutate(lat = round(lat,1)) |>
    dplyr::select(-area, -lon) |>
    filter(year >= start_year) |>
    tidyr::pivot_wider(id_cols=c("LABEL_ID", "GBR_NAME", "lat"), values_from="dhw", names_from="year") |>
    dplyr::rename(ID = LABEL_ID, Reef=GBR_NAME) |>
    dplyr::filter(if_any(matches("^19|^20"), ~ !is.nan(.)))

  return(output)

}

OISST_DHW_heatmap <- extract_heatmap(OISST_DHW, 1982)
CRW_DHW_heatmap <- extract_heatmap(CRW_DHW, 1985)
ERA5_DHW_heatmap <- extract_heatmap(ERA5_DHW, 1981)

write.csv(OISST_DHW_heatmap, "/Users/rof011/dhw3/data/OISST_DHWmax.csv", row.names = FALSE)
write.csv(CRW_DHW_heatmap, "/Users/rof011/dhw3/data/CRW_DHWmax.csv", row.names = FALSE)
write.csv(ERA5_DHW_heatmap, "/Users/rof011/dhw3/data/ERA5_DHWmax.csv", row.names = FALSE)

