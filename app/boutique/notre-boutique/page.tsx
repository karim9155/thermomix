import { ArrowRight, MapPin, Phone } from 'lucide-react'
import { BoutiqueShell } from '@/components/boutique-shell'

export default function StorePage() {
  return (
    <BoutiqueShell>
      <section className="store-page">
        <div>
          <p className="eyebrow">INOCASA LA MARSA</p>
          <h1>
            Venez vivre
            <br />
            <em>l&apos;expérience.</em>
          </h1>
          <p className="store-lead">
            Essayez le Thermomix® TM7, échangez avec nos conseillers et repartez avec de nouvelles
            idées.
          </p>

          <div className="store-info">
            <div>
              <MapPin size={20} />
              <p>
                <strong>Notre adresse</strong>
                Immeuble Villa Jade, Commerce N3, RDC
                <br />
                Avenue du Stade, La Marsa 2070, Tunisie
              </p>
            </div>
            <div>
              <Phone size={20} />
              <p>
                <strong>Nos horaires</strong>
                Du lundi au vendredi de 9h00 à 18h00
                <br />
                Le samedi de 9h00 à 13h00
              </p>
            </div>
          </div>

          <div className="hero-actions">
            <a href="tel:+21622081414" className="primary-button">
              <Phone size={16} /> Nous appeler
            </a>
            <a href="#map" className="outline-button">
              Itinéraire <ArrowRight size={16} />
            </a>
          </div>
        </div>

        <div className="map-placeholder" id="map">
          <MapPin size={34} />
          <span>INOCASA</span>
          <small>La Marsa · Tunisie</small>
          <div className="map-road road-one" />
          <div className="map-road road-two" />
        </div>
      </section>
    </BoutiqueShell>
  )
}
