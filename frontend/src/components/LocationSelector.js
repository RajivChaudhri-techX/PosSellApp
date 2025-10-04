import React, { useState, useEffect } from 'react';
import { FormControl, InputLabel, Select, MenuItem, Box, Typography } from '@mui/material';
import { locationsAPI } from '../services/locations';

const LocationSelector = ({ selectedLocation, onLocationChange, showAllOption = true, disabled = false }) => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const response = await locationsAPI.getLocations();
      setLocations(response.data.locations || []);
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minWidth: 200 }}>
        <Typography>Loading locations...</Typography>
      </Box>
    );
  }

  return (
    <FormControl sx={{ minWidth: 200 }} disabled={disabled}>
      <InputLabel>Location</InputLabel>
      <Select
        value={selectedLocation || ''}
        label="Location"
        onChange={(e) => onLocationChange(e.target.value)}
      >
        {showAllOption && (
          <MenuItem value="">
            <em>All Locations</em>
          </MenuItem>
        )}
        {locations.map((location) => (
          <MenuItem key={location.id} value={location.id}>
            {location.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default LocationSelector;