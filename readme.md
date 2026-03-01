## Background

I commute in Chennai, primarily using the metro and often relying on station parking. My journey involves a platform change that is unnecessarily time consuming, along with one leg where the wait can stretch to twelve minutes. I found the uncertainty irritating.

So I built this over a Sunday evening.

The aim is simple: calculate realistic journey times, determine the most sensible time to leave, and surface parking availability at nearby stations at a glance.

It is intentionally barebones at present.


## Current Flow
0. Set up backend endpoints  
1. Seed station data (currently CMRL)  
2. Select possible source and destination stations  
3. Define journey legs (temporary, to be replaced with dynamic time and distance calculation via OSRM)  
4. Display possible journeys on the homepage, including parking data  

## Future Work
- Integration of live traffic data (useful, though not essential)

### Parking Intelligence
- Predicted last viable parking time at each station  
- Historical parking occupancy trends  
- Ease of access indicators  

### Community Layer
- User ratings  
- Live, user submitted updates  
- Inclusion of intra station walking time in overall journey calculation  


Built on a Sunday evening to ease the commute and make Mondays a tad more tolerable.