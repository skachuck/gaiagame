/**
 * Module that registers the Energy Balance Model
 */
var EBM = {
        _STEFAN_BOLTZ: 5.67e-8, // W m-2 K-4
        _BASE_EMISSIVITY: 0.6, 
        _SOLAR_S0: 1367,       // W m-2
        _BASE_ALBEDO: 0.3,

        Gases : {
                'co2' : {
                        name: _('CO2'),
                        delta_e: 0.02,
                        tau: 100
                        },
                'ch4' : {
                        name: _('CH4'),
                        delta_e: 0.05,
                        tau: 10
                        }
        },

        init: function(options) {
                this.options = $.extend(
                        this.options,
                        options
                );
                
                if(typeof $SM.get('ebm.concentrations') == 'undefined') {
                        $SM.set('ebm.concentrations', {});
                        for (var gas in EBM.Gases) {
                                $SM.set('ebm.concentrations["'+gas+'"]', 0.);
                        }
		}

		//subscribe to stateUpdates
		$.Dispatch('stateUpdate').subscribe(EBM.handleStateUpdates);
        },

        timeStep: function(dt) {
                for (gas in EBM.Gases) {
                        con = $SM.get('ebm.concentrations["'+gas+'"]');
                        $SM.add('ebm.concentrations["'+gas+'"]', -con/EBM.Gases[gas].tau*dt);
                }
        },

        getEmissivity: function() {
                var em = EBM._BASE_EMISSIVITY;
                for (var gas in EBM.Gases) {
                        con = $SM.get('ebm.concentrations["'+gas+'"]');
                        em += con*EBM.Gases[gas].delta_e;
                } 
                return em;
        },

        getAlbedo: function() {
                return EBM._BASE_ALBEDO;
        },

        surfaceTemp: function() {
                var S0 = EBM._SOLAR_S0;
                var al = EBM.getAlbedo();
                var em = EBM.getEmissivity();
                var si = EBM._STEFAN_BOLTZ;
                // The idealized, one layer atmosphere model
                Ts = Math.pow(S0*(1-al)/(4*si*(1-0.5*em)), 0.25);
                return Ts;
        }
}
        
