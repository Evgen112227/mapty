'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
let inputDistance = document.querySelector('.form__input--distance');
let inputDuration = document.querySelector('.form__input--duration');
let inputCadence = document.querySelector('.form__input--cadence');
let inputElevation = document.querySelector('.form__input--elevation');
const clearAllBtn = document.querySelector('.sidebar__clear-button');

/-------------Class WorkOut-------------------/

class Workout {
	date = new Date();
	id = (Date.now() + '').slice(-10);

	constructor(coords, distance, duration) {
		this.coords = coords; //[lat, lng]
		this.distance = distance;
		this.duration = duration;
	}

	_setDescription() {
		const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
		this.description = `${this.type} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
	}

}

/-------------Class Running-------------------/

class Running extends Workout {
	type = 'running';
	constructor(coords, distance, duration, cadence) {
		super(coords, distance, duration);
		this.cadence = cadence;
		this.calcPace();
		this._setDescription();
	}

	calcPace() {
		this.pace = this.duration / this.distance;
		return this.pace;
	}
}

/-------------Class Cycling-------------------/

class Cycling extends Workout {
	type = 'cycling';
	constructor(coords, distance, duration, elevationGain) {
		super(coords, distance, duration);
		this.elevationGain = elevationGain;
		this.calcSpeed();
		this._setDescription();
	}

	calcSpeed() {
		this.speed = this.distance / (this.duration / 60);
		return this.speed
	}
}

/-------------Class App------------------/


class App {
	#map; //private property
	#mapEvt; //private property
	#workouts = [];
	#markers = [];

	constructor() {
		// get user current position
		this._getPosition();
		//GEt data from user localstorage
		this._getLocalStorage();
		this._toggleClearBtn();
		form.addEventListener('submit', this._newWorkout.bind(this));
		inputType.addEventListener('change', this._toggleElevationField);
		containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
		containerWorkouts.addEventListener('click', this._delForm.bind(this));
	}

	_getPosition() {
		navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
			console.log('CCouldnt get your position');
		});
	}

	_loadMap(position) {
		const { latitude } = position.coords; //getting current location coordinates
		const { longitude } = position.coords;

		this.#map = L.map('map').setView([latitude, longitude], 13);

		L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
		}).addTo(this.#map);

		//handling clicks on map
		this.#map.on('click', this._showForm.bind(this));
		//when map is loaded - add markers from workouts array
		this.#workouts.forEach(w => {
			this._renderWorkoutMarker(w);
		});
	}

	_showForm(mapEvent) {
		this.#mapEvt = mapEvent;
		form.classList.remove('hidden'); //display form
		inputDistance.focus(); //focus on field of form
	}

	_hideForm() {
		//clear input
		inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
		form.style.display = 'none';
		form.classList.add('hidden');
		setTimeout(() => (form.style.display = 'grid'), 1000);
	}

	_toggleElevationField() {
		inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
		inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
	}

	_toggleClearBtn() {
		if (this.#workouts.length >= 2) {
			clearAllBtn.hidden = false;
			return;
		} clearAllBtn.hidden = true;
	}

	_newWorkout(e) {
		//helper function, return true if ALL inputs are numbers.
		const validateInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
		//another hepler function, returns true if all inputs have positive numbers
		const isAllPositive = (...inputs) => inputs.every(inp => inp > 0);
		e.preventDefault();
		//getting data from form
		const type = inputType.value;
		const distance = +inputDistance.value;
		const duration = +inputDuration.value;
		const { lat, lng } = this.#mapEvt.latlng;
		let workout;

		if (type === 'running') {
			const cadence = +inputCadence.value;
			if (!validateInputs(distance, duration, cadence) || !isAllPositive(distance, duration, cadence))
				return alert('Inputs have to be positive numbers!')
			workout = new Running([lat, lng], distance, duration, cadence);
		};

		if (type === 'cycling') {
			const elevation = +inputElevation.value;
			//if one of the input contains not a number, execute if block with alert!
			if (!validateInputs(distance, duration, elevation) || !isAllPositive(distance, duration))
				return alert('Inputs have to be positive numbers!');
			workout = new Cycling([lat, lng], distance, duration, elevation);
		};

		this.#workouts.push(workout);
		this._renderWorkoutMarker(workout);
		this._renderWorkout(workout);
		//hide form + clear input fields
		this._hideForm();
		this._setLocalStorage();
		this._toggleClearBtn();
	}
	_renderWorkoutMarker(workout) {
		let marker = L.marker(workout.coords);
		this.#markers.push(marker);
		marker.addTo(this.#map)
			.bindPopup(
				L.popup({
					maxWidth: 250,
					minWidth: 100,
					autoClose: false,
					closeOnClick: false,
					className: `${workout.type}-popup`,
				})
			)
			.setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
			.openPopup();
	}

	_renderWorkout(workout) {
		let fragment = `
			<li class="workout workout--${workout.type}" data-id="${workout.id}">
				<h2 class="workout__title">${workout.description}</h2>
				<button class="workout__del"></button>
				<div class="workout__details">
					<span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
					<span class="workout__value">${workout.distance}</span>
					<span class="workout__unit">km</span>
				</div>
				<div class="workout__details">
					<span class="workout__icon">⏱</span>
					<span class="workout__value">${workout.duration}</span>
					<span class="workout__unit">min</span>
				</div>`;

		if (workout.type === 'running') {
			fragment += `
				<div class="workout__details">
					<span class="workout__icon">⚡️</span>
					<span class="workout__value">${workout.pace.toFixed()}</span>
					<span class="workout__unit">min/km</span>
				</div>
				<div class="workout__details">
					<span class="workout__icon">🦶🏼</span>
					<span class="workout__value">${workout.cadence}</span>
					<span class="workout__unit">spm</span>
				</div>
			</li>`
		}
		if (workout.type === 'cycling') {
			fragment += `
				<div class="workout__details">
					<span class="workout__icon">⚡️</span>
					<span class="workout__value">${workout.speed}</span>
					<span class="workout__unit">km/h</span>
				</div>
				<div class="workout__details">
					<span class="workout__icon">⛰</span>
					<span class="workout__value">${workout.elevationGain}</span>
					<span class="workout__unit">m</span>
				</div>
			</li>`
		}
		form.insertAdjacentHTML('afterend', fragment);
	}

	_moveToPopup(e) {
		const workoutEl = e.target.closest('.workout');
		if (!workoutEl) return;
		const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);
		this.#map.setView(workout.coords, 13, {
			animate: true,
			pan: {
				duration: 1
			}
		})
	}

	_delForm(e) {
		// e.preventDefault();
		let button = e.target.closest('.workout__del');
		let form = e.target.closest('.workout');
		if (!button) return;
		let workoutToDel = this.#workouts.findIndex((el) => el.id === form.dataset.id);
		form.style.display = 'none';
		let markerToDelete = this.#markers.find(m => this.#workouts[workoutToDel].coords[0] == m._latlng['lat']);
		this.#map.removeLayer(markerToDelete);
		this.#workouts.splice(workoutToDel, 1);
		localStorage.removeItem('workout');
		this._setLocalStorage();
		this._toggleClearBtn();
	}

	_setLocalStorage() {
		localStorage.setItem('workout', JSON.stringify(this.#workouts));
	}

	_getLocalStorage() {
		const data = JSON.parse(localStorage.getItem('workout'));
		if (!data) return;
		this.#workouts = data;
		this.#workouts.forEach(w => {
			this._renderWorkout(w);
		})
	}

	reset() {
		localStorage.removeItem('workout');
		this.#workouts = [];
		this.#markers = [];
		// location.reload();
	}
}

/--------------------------------/

const app = new App();






