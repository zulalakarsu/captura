import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { useTheme, SegmentedButtons, Chip, Searchbar, Button } from 'react-native-paper';
import { mockRequests, PhotoRequest } from './index';
import * as Location from 'expo-location';
import debounce from 'lodash/debounce';

// Categories from the buyer home screen
const categories = ['Urban', 'Architecture', 'Campus', 'Nature', 'Events', 'Street Art'];

interface Location {
  id: string;
  value: string;
  subtitle?: string;
  distance?: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

interface ExpirationOption {
  id: string;
  label: string;
  value: string;
  deadline: string;
}

const locations: Location[] = [
  {
    id: "1",
    value: "Boston Common",
    coordinates: { latitude: 42.3551, longitude: -71.0657 }
  },
  {
    id: "2",
    value: "TD Garden",
    coordinates: { latitude: 42.3600, longitude: -71.0568 }
  },
  {
    id: "3",
    value: "Harvard Square",
    coordinates: { latitude: 42.3736, longitude: -71.1190 }
  },
  {
    id: "4",
    value: "Custom Location",
    coordinates: { latitude: 42.3601, longitude: -71.0549 }
  }
];

const expirationOptions: ExpirationOption[] = [
  {
    id: "1",
    label: "1 day",
    value: "1",
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "2",
    label: "3 days",
    value: "3",
    deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "3",
    label: "1 week",
    value: "7",
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Reward options (non-monetary in v0.1)
const rewardOptions = [
  { id: '1', label: '$5 Coupon', value: '5' },
  { id: '2', label: '$10 Coupon', value: '10' },
  { id: '3', label: '$15 Coupon', value: '15' },
  { id: '4', label: '$20 Coupon', value: '20' },
  { id: '5', label: '$25 Coupon', value: '25' },
  { id: '6', label: '$30 Coupon', value: '30' },
];

// Calculate distance between two points in kilometers
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Helper function to format distance
const formatDistance = (distance: number): string => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }
  return `${distance.toFixed(1)} km`;
};

export default function CreateRequest() {
  const router = useRouter();
  const theme = useTheme();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  
  const [formData, setFormData] = useState({
    title: "Back Bay Urban Photography",
    description: "Looking for high-quality urban photos of Back Bay area, similar to recent shots. Particularly interested in architectural details and street scenes.",
    location: '',
    customLocation: '',
    locationSearch: '',
    selectedLocation: null as Location | null,
    categories: ['Urban'] as string[],
    maxPhotos: '5',
    budget: '200-300',
    deadline: '3',
    urgency: 'normal',
  });

  const searchLocations = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      // Get current location
      const currentLocation = await Location.getCurrentPositionAsync({});

      // Search for locations using the query
      const searchResults = await Location.geocodeAsync(query);
      
      if (searchResults.length > 0) {
        // Convert the results to our format
        const formattedResults = await Promise.all(
          searchResults.map(async (result) => {
            // Get the address for each location
            const [address] = await Location.reverseGeocodeAsync({
              latitude: result.latitude,
              longitude: result.longitude,
            });

            // Calculate distance from current location
            const distance = calculateDistance(
              currentLocation.coords.latitude,
              currentLocation.coords.longitude,
              result.latitude,
              result.longitude
            );

            // Format the main title and subtitle
            const mainTitle = address?.name || '';
            const subtitle = [address?.street, address?.city, address?.region]
              .filter(Boolean)
              .join(', ');

            return {
              id: `${result.latitude},${result.longitude}`,
              value: mainTitle,
              subtitle: subtitle,
              distance: distance,
              coordinates: {
                latitude: result.latitude,
                longitude: result.longitude,
              }
            };
          })
        );

        setSearchResults(formattedResults);
      }
    } catch (error) {
      console.error('Error searching locations:', error);
      setSearchResults([]);
    }
  };

  const debouncedSearch = useMemo(
    () => debounce(searchLocations, 300),
    [searchLocations]
  );

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const handleSubmit = () => {
    const newRequest: PhotoRequest = {
      id: (mockRequests.length + 1).toString(),
      title: formData.title,
      description: formData.description,
      location: formData.selectedLocation?.value || formData.locationSearch,
      category: formData.categories.join(', '),
      budget: formData.budget,
      deadline: expirationOptions.find(opt => opt.value === formData.deadline)?.deadline || new Date().toISOString(),
      urgency: formData.urgency as 'normal' | 'urgent',
      responseCount: 0,
      matchedPhotos: 0,
      coordinates: formData.selectedLocation?.coordinates || {
        latitude: 42.3601,
        longitude: -71.0549
      }
    };

    mockRequests.unshift(newRequest);
    router.push('/(buyer)');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Basic Information</Text>
            <Text style={styles.stepSubtitle}>Step 1 of 4</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter a title for your request"
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the photos you're looking for"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        );
      
      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Location & Category</Text>
            <Text style={styles.stepSubtitle}>Step 2 of 4</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Location</Text>
              <View style={styles.searchContainer}>
                <Searchbar
                  placeholder="Search for a location"
                  value={formData.locationSearch}
                  onChangeText={(text) => {
                    setFormData({ ...formData, locationSearch: text });
                    if (text.length >= 2) {
                      debouncedSearch(text);
                    } else {
                      setSearchResults([]);
                    }
                  }}
                  style={styles.searchBar}
                />
                
                {searchResults.length > 0 && (
                  <FlatList
                    data={searchResults}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.searchResultItem}
                        onPress={() => {
                          setFormData({
                            ...formData,
                            location: item.id,
                            locationSearch: item.value,
                            selectedLocation: item
                          });
                          setSearchResults([]);
                        }}
                      >
                        <View style={styles.searchResultContent}>
                          <View style={styles.searchResultMain}>
                            <Text style={styles.searchResultTitle}>{item.value}</Text>
                            {item.subtitle && (
                              <Text style={styles.searchResultSubtitle}>{item.subtitle}</Text>
                            )}
                          </View>
                          {item.distance !== undefined && (
                            <Text style={styles.searchResultDistance}>
                              {formatDistance(item.distance)}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    )}
                    style={styles.searchResultsList}
                  />
                )}
              </View>
            </View>
            
            <CategorySelector />
          </View>
        );
      
      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Requirements</Text>
            <Text style={styles.stepSubtitle}>Step 3 of 4</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Maximum number of photos</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.maxPhotos}
                  onValueChange={(value: string) => setFormData({ ...formData, maxPhotos: value })}
                  style={styles.picker}
                >
                  {['1', '3', '5', '10', '15', '20'].map((num) => (
                    <Picker.Item key={num} label={num} value={num} />
                  ))}
                </Picker>
              </View>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Budget Range</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.budget}
                  onValueChange={(value: string) => setFormData({ ...formData, budget: value })}
                  style={styles.picker}
                >
                  {rewardOptions.map((option) => (
                    <Picker.Item key={option.value} label={option.label} value={option.value} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        );
      
      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Review Request</Text>
            <Text style={styles.stepSubtitle}>Step 4 of 4</Text>
            
            <View style={styles.reviewContainer}>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Title:</Text>
                <Text style={styles.reviewValue}>{formData.title}</Text>
              </View>
              
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Description:</Text>
                <Text style={styles.reviewValue}>{formData.description}</Text>
              </View>
              
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Location:</Text>
                <Text style={styles.reviewValue}>
                  {formData.selectedLocation?.value || formData.locationSearch}
                </Text>
              </View>
              
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Category:</Text>
                <Text style={styles.reviewValue}>{formData.categories.join(', ')}</Text>
              </View>
              
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Max Photos:</Text>
                <Text style={styles.reviewValue}>{formData.maxPhotos}</Text>
              </View>
              
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Budget:</Text>
                <Text style={styles.reviewValue}>{formData.budget}</Text>
              </View>
            </View>
          </View>
        );
      
      default:
        return null;
    }
  };

  // Update the category selection UI
  const CategorySelector = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>Categories (Select multiple)</Text>
      <View style={styles.categoriesWrapper}>
        {categories.map((category) => (
          <Chip
            key={category}
            mode="outlined"
            selected={formData.categories.includes(category)}
            onPress={() => {
              const updatedCategories = formData.categories.includes(category)
                ? formData.categories.filter(c => c !== category)
                : [...formData.categories, category];
              setFormData({ ...formData, categories: updatedCategories });
            }}
            style={styles.categoryChipNew}
            selectedColor="#007AFF"
            showSelectedOverlay
          >
            {category}
          </Chip>
        ))}
      </View>
      {formData.categories.length === 0 && (
        <Text style={styles.categoryWarning}>Please select at least one category</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Photo Request</Text>
        <View style={styles.placeholder} />
      </View>
      
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4].map((step) => (
          <View key={step} style={styles.progressStepContainer}>
            <View 
              style={[
                styles.progressStep, 
                currentStep >= step ? styles.progressStepActive : {}
              ]} 
            />
            {step < 4 && (
              <View 
                style={[
                  styles.progressLine, 
                  currentStep > step ? styles.progressLineActive : {}
                ]} 
              />
            )}
          </View>
        ))}
      </View>
      
      <View style={styles.mainContent}>
        <ScrollView style={styles.content}>
          {renderStep()}
        </ScrollView>
        
        <View style={styles.footer}>
          <Button 
            mode="contained"
            onPress={handleNext}
            style={styles.nextButton}
          >
            {currentStep === 4 ? 'Submit Request' : 'Next'}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 8,
  },
  progressStepContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressStep: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ddd',
  },
  progressStepActive: {
    backgroundColor: '#007AFF',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#ddd',
    marginHorizontal: 4,
  },
  progressLineActive: {
    backgroundColor: '#007AFF',
  },
  mainContent: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  searchContainer: {
    position: 'relative',
    zIndex: 1,
  },
  searchBar: {
    elevation: 0,
    backgroundColor: '#f5f5f5',
  },
  searchResultsList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchResultContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchResultMain: {
    flex: 1,
  },
  searchResultTitle: {
    fontSize: 16,
    color: '#333',
  },
  searchResultSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  searchResultDistance: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  reviewContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
  },
  reviewItem: {
    marginBottom: 16,
  },
  reviewLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  reviewValue: {
    fontSize: 16,
    color: '#333',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  nextButton: {
    height: 50,
    justifyContent: 'center',
  },
  categoriesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  categoryChipNew: {
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  categoryWarning: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
  },
}); 