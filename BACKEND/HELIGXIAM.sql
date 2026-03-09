-- Database: HELIGXIAM


	-- ======================================================================
-- SCHEMA POSTGRESQL - Marketplace (basé sur MCD/MLD fourni)
-- ======================================================================

-- Extension pour UUID (requis)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table Utilisateur (entités principales)
CREATE TABLE "Utilisateur" (
    id_user       UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nom           VARCHAR(100) NOT NULL,
    prenom        VARCHAR(100) NOT NULL,
    role          VARCHAR(20) NOT NULL CHECK (role IN ('client', 'vendeur', 'admin')),
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Table Adresse
CREATE TABLE "Adresse" (
    id_adresse    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    rue           VARCHAR(255) NOT NULL,
    ville         VARCHAR(100) NOT NULL,
    code_postal   VARCHAR(10) NOT NULL,
    pays          VARCHAR(100) DEFAULT 'France',
    id_user       UUID NOT NULL REFERENCES "Utilisateur"(id_user) ON DELETE CASCADE,
    is_principale BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Table Boutique
CREATE TABLE "Boutique" (
    id_boutique   UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nom_boutique  VARCHAR(150) NOT NULL,
    description   TEXT,
    logo          VARCHAR(255),
    id_user       UUID NOT NULL REFERENCES "Utilisateur"(id_user) ON DELETE CASCADE,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Table Categorie (hiérarchique possible)
CREATE TABLE "Categorie" (
    id_categorie  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    libelle       VARCHAR(100) NOT NULL,
    parent_id     UUID REFERENCES "Categorie"(id_categorie),
    niveau        INT DEFAULT 1
);

-- Table Stock
CREATE TABLE "Stock" (
    id_stock      UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    quantite      INTEGER NOT NULL DEFAULT 0 CHECK (quantite >= 0),
    quantite_reserve INTEGER NOT NULL DEFAULT 0,
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Table Produit
CREATE TABLE "Produit" (
    id_produit    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nom_produit   VARCHAR(200) NOT NULL,
    description   TEXT,
    images        JSONB,                    -- ["url1", "url2"]
    attributs     JSONB,                    -- {"couleur": "rouge", "taille": "M"}
    prix          NUMERIC(10,2) NOT NULL CHECK (prix > 0),
    prix_promo    NUMERIC(10,2) CHECK (prix_promo > 0 AND prix_promo < prix),
    id_stock      UUID REFERENCES "Stock"(id_stock) ON DELETE SET NULL,
    id_categorie  UUID REFERENCES "Categorie"(id_categorie) ON DELETE SET NULL,
    id_boutique   UUID REFERENCES "Boutique"(id_boutique) ON DELETE SET NULL,
    is_actif      BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Table Avis
CREATE TABLE "Avis" (
    id_avis       UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    note          INTEGER NOT NULL CHECK (note BETWEEN 1 AND 5),
    commentaire   TEXT,
    id_produit    UUID NOT NULL REFERENCES "Produit"(id_produit) ON DELETE CASCADE,
    id_user       UUID NOT NULL REFERENCES "Utilisateur"(id_user) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger pour calculer la note moyenne (optionnel)
CREATE OR REPLACE FUNCTION update_produit_avg_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE "Produit" 
    SET avg_note = (
        SELECT AVG(note::numeric) 
        FROM "Avis" 
        WHERE id_produit = NEW.id_produit
    )
    WHERE id_produit = NEW.id_produit;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_avg_rating
    AFTER INSERT OR UPDATE OR DELETE ON "Avis"
    FOR EACH ROW EXECUTE FUNCTION update_produit_avg_rating();

-- Table Panier
CREATE TABLE "Panier" (
    id_panier     UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    id_user       UUID NOT NULL REFERENCES "Utilisateur"(id_user) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(id_user)
);

-- Table LignePanier
CREATE TABLE "LignePanier" (
    id_ligne      UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    quantite      INTEGER NOT NULL CHECK (quantite > 0),
    id_panier     UUID NOT NULL REFERENCES "Panier"(id_panier) ON DELETE CASCADE,
    id_produit    UUID NOT NULL REFERENCES "Produit"(id_produit) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(id_panier, id_produit)
);

-- Table Commande
CREATE TABLE "Commande" (
    id_commande   UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    numero_cmd    VARCHAR(50) UNIQUE NOT NULL,
    date_commande TIMESTAMPTZ DEFAULT NOW(),
    statut        VARCHAR(30) NOT NULL DEFAULT 'en_attente', -- en_attente|payee|expédiée|livrée|annulée
    total_ht      NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_ttc     NUMERIC(12,2) NOT NULL DEFAULT 0,
    frais_livraison NUMERIC(8,2) DEFAULT 0,
    id_user       UUID NOT NULL REFERENCES "Utilisateur"(id_user) ON DELETE CASCADE,
    id_adresse_livraison UUID REFERENCES "Adresse"(id_adresse) ON DELETE RESTRICT,
    id_adresse_facturation UUID REFERENCES "Adresse"(id_adresse) ON DELETE SET NULL
);

-- Table LigneCommande
CREATE TABLE "LigneCommande" (
    id_ligne      UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    quantite      INTEGER NOT NULL CHECK (quantite > 0),
    prix_unitaire NUMERIC(10,2) NOT NULL,
    id_commande   UUID NOT NULL REFERENCES "Commande"(id_commande) ON DELETE CASCADE,
    id_produit    UUID NOT NULL REFERENCES "Produit"(id_produit) ON DELETE RESTRICT,
    UNIQUE(id_commande, id_produit)
);

-- Table Coupon
CREATE TABLE "Coupon" (
    id_coupon     UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code          VARCHAR(50) NOT NULL UNIQUE,
    type_reduc    VARCHAR(20) NOT NULL CHECK (type_reduc IN ('pourcentage', 'montant_fixe')),
    valeur        NUMERIC(8,2) NOT NULL,
    limite_uti    INTEGER DEFAULT 1,
    uti_restantes INTEGER DEFAULT 1,
    date_expiration DATE NOT NULL,
    is_actif      BOOLEAN DEFAULT TRUE
);

-- Table Commande_Coupon
CREATE TABLE "Commande_Coupon" (
    id_commande   UUID NOT NULL REFERENCES "Commande"(id_commande) ON DELETE CASCADE,
    id_coupon     UUID NOT NULL REFERENCES "Coupon"(id_coupon) ON DELETE CASCADE,
    montant_reduc NUMERIC(10,2) NOT NULL,
    PRIMARY KEY (id_commande, id_coupon)
);

-- Table Paiement
CREATE TABLE "Paiement" (
    id_paiement   UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    montant       NUMERIC(12,2) NOT NULL,
    mode_paiement VARCHAR(30) NOT NULL, -- carte|paypal|virement|crypto
    statut        VARCHAR(20) NOT NULL DEFAULT 'en_attente', -- en_attente|paye|refuse|rembourse
    reference     VARCHAR(100),
    date_paiement TIMESTAMPTZ,
    id_commande   UUID NOT NULL REFERENCES "Commande"(id_commande) ON DELETE CASCADE,
    UNIQUE(id_commande)
);

-- Table Livraison
CREATE TABLE "Livraison" (
    id_livraison  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    numero_suivi  VARCHAR(100),
    statut        VARCHAR(30) NOT NULL DEFAULT 'preparee', -- preparee|envoyee|en_transit|livree|probleme
    date_envoi    TIMESTAMPTZ,
    date_livraison TIMESTAMPTZ,
    id_commande   UUID NOT NULL REFERENCES "Commande"(id_commande) ON DELETE CASCADE,
    UNIQUE(id_commande)
);

-- Table Retour
CREATE TABLE "Retour" (
    id_retour     UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    motif         VARCHAR(255) NOT NULL,
    statut        VARCHAR(20) DEFAULT 'demande', -- demande|accepte|refuse|traite
    date_demande  TIMESTAMPTZ DEFAULT NOW(),
    date_traitement TIMESTAMPTZ,
    id_commande   UUID NOT NULL REFERENCES "Commande"(id_commande) ON DELETE CASCADE
);

-- Index pour performances
CREATE INDEX idx_produit_boutique ON "Produit"(id_boutique);
CREATE INDEX idx_produit_categorie ON "Produit"(id_categorie);
CREATE INDEX idx_produit_prix ON "Produit"(prix);
CREATE INDEX idx_commande_user ON "Commande"(id_user, date_commande DESC);
CREATE INDEX idx_avis_produit ON "Avis"(id_produit);
CREATE INDEX idx_utilisateur_role ON "Utilisateur"(role);

-- Vues utiles
CREATE VIEW v_produits_actifs AS
SELECT 
    p.*, 
    b.nom_boutique, 
    u.nom as vendeur_nom,
    s.quantite as stock_dispo,
    COALESCE(AVG(a.note), 0) as note_moyenne,
    COUNT(a.id_avis) as nb_avis
FROM "Produit" p
JOIN "Boutique" b ON p.id_boutique = b.id_boutique
JOIN "Utilisateur" u ON b.id_user = u.id_user
LEFT JOIN "Stock" s ON p.id_stock = s.id_stock
LEFT JOIN "Avis" a ON p.id_produit = a.id_produit
WHERE p.is_actif = TRUE AND s.quantite > 0
GROUP BY p.id_produit, b.nom_boutique, u.nom, s.quantite;

-- Fonction trigger pour mise à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_utilisateur_updated_at
    BEFORE UPDATE ON "Utilisateur"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_produit_updated_at
    BEFORE UPDATE ON "Produit"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
