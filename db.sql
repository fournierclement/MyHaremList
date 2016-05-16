
CREATE TABLE users
(
 nickname varchar(30) NOT NULL PRIMARY KEY,
 email varchar(63) NOT NULL UNIQUE,
 password varchar(144) NOT NULL
);

CREATE TABLE universe
(
 universeName varchar(144) PRIMARY KEY,
 universeNbr bigserial,
 universeDesc varchar(666)
);

CREATE TABLE characs
(
 charId bigserial PRIMARY KEY,
 charName varchar(63) NOT NULL,
 alterNames varchar(144),
 charGender Varchar(7) NOT NULL,
 charDesc varchar(666),
 universeName varchar(144) REFERENCES universe(universeName) ON DELETE CASCADE
);

CREATE TABLE harems
(
 haremId bigserial PRIMARY KEY,
 nickname varchar(30) REFERENCES users(nickname) ON DELETE CASCADE,
 haremName varchar(63) NOT NULL,
 haremDesc varchar(144)
);
CREATE TABLE weddings
(
 haremId bigserial REFERENCES harems(haremId) ON DELETE CASCADE,
 charId bigserial REFERENCES characs(charId) ON DELETE CASCADE,
 wedDesc varchar(144),
 favorite boolean DEFAULT false,
 PRIMARY KEY (haremId, charId)
);

-- TRIGGERS :
--Generate a default harem when a user sign up
CREATE FUNCTION first_harem() RETURNS trigger AS $first_harem$
    BEGIN
        INSERT INTO harems (nickname,haremName,haremDesc)
            VALUES (NEW.nickname,'My first harem', 'We must all begun somewhere');
        RETURN NEW;
    END;
$first_harem$ LANGUAGE plpgsql;

CREATE TRIGGER first_harem
    AFTER INSERT ON users FOR EACH ROW
    EXECUTE PROCEDURE first_harem();

--Keep only One favorite par harem
CREATE FUNCTION one_favorite() RETURNS trigger AS $one_favorite$
    BEGIN
        UPDATE weddings
            SET favorite = false
            WHERE haremId=NEW.haremId AND favorite = true;
        RETURN NEW;
    END;
$one_favorite$ LANGUAGE plpgsql;

CREATE TRIGGER one_favorite
    BEFORE INSERT OR UPDATE ON weddings FOR EACH ROW
    WHEN (NEW.favorite)
    EXECUTE PROCEDURE one_favorite();


--Tests :
INSERT INTO universe (universeName,universeDesc)
    VALUES ('Fate/Stay','Why would you fight for the Graal when you can Catch them all');
INSERT INTO characs (charName,alterNames,charGender,charDesc,universeName)
    VALUES ('Saber','Arthuria, Arthur, King of Knights, SABAAA.','Waifu','A king craving for redemption','Fate/Stay');
INSERT INTO characs (charName,alterNames,charGender,charDesc,universeName)
    VALUES ('Gilgamesh','Heres King', 'Husband','A highschooler who thinks everything belong to him.','Fate/Stay');

